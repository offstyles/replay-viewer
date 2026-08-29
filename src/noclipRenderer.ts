import { mat4 } from "gl-matrix";

import ArrayBufferSlice from "./noclip/ArrayBufferSlice.js";
import { Camera as NoclipCamera } from "./noclip/Camera.js";
import { DataShare } from "./noclip/DataShare.js";
import { DataFetcher } from "./noclip/DataFetcher.js";
import { AntialiasingMode } from "./noclip/gfx/helpers/RenderGraphHelpers.js";
import type {
    GfxDevice,
    GfxSwapChain,
    GfxTexture,
} from "./noclip/gfx/platform/GfxPlatform.js";
import {
    createSwapChainForWebGL2,
    GfxPlatformWebGL2Config,
} from "./noclip/gfx/platform/GfxPlatformWebGL2.js";
import { BSPFile, BSPFileVariant } from "./noclip/SourceEngine/BSPFile.js";
import {
    BSPRenderer,
    LooseMount,
    SkyboxRenderer,
    SourceFileSystem,
    SourceLoadContext,
    SourceRenderContext,
    SourceRenderer,
} from "./noclip/SourceEngine/Main.js";
import type { SceneContext } from "./noclip/SceneBase.js";
import type { ViewerRenderInput } from "./noclip/viewer.js";
import { DEFAULT_RENDER_SETTINGS, type AntialiasingSetting, type RenderSettings } from "./renderSettings";

export type { RenderSettings } from "./renderSettings";

function antialiasingModeFor(s: AntialiasingSetting): AntialiasingMode {
    switch (s) {
        case 'fxaa': return AntialiasingMode.FXAA;
        case 'msaa4': return AntialiasingMode.MSAAx4;
        case 'none': return AntialiasingMode.None;
    }
}

const CSPAK_BASE = "/api/csspak";

// Source: +X fwd, +Y left, +Z up. noclip: +X right, +Y up, -Z fwd.
const NOCLIP_FROM_SOURCE = mat4.fromValues(
     0,  0, -1, 0,
    -1,  0,  0, 0,
     0,  1,  0, 0,
     0,  0,  0, 1,
);
const sourceWorldMatrix = mat4.create();

function isCSPakJunkPath(path: string): boolean {
    const base = path.split('/').pop() ?? '';
    if (base === '' || base.startsWith('.')) return true;
    if (/^sp(_hdr)?_\d+\.vhv$/i.test(base)) return true;
    return false;
}

class CSPakMount extends LooseMount {
    private missCache = new Set<string>();

    constructor() {
        super("", []);
    }

    public misses(): string[] {
        return [...this.missCache].sort();
    }

    public override hasEntry(resolvedPath: string): boolean {
        if (isCSPakJunkPath(resolvedPath)) return false;
        return !this.missCache.has(resolvedPath);
    }

    public override async fetchEntryData(
        _dataFetcher: DataFetcher,
        resolvedPath: string,
    ): Promise<ArrayBufferSlice> {
        const NULL = null as unknown as ArrayBufferSlice;
        if (isCSPakJunkPath(resolvedPath)) return NULL;
        if (this.missCache.has(resolvedPath)) return NULL;
        const url = `${CSPAK_BASE}/${resolvedPath}`;

        const maxAttempts = 3;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            let resp: Response | null = null;
            let networkErr = false;
            try {
                resp = await fetch(url, { credentials: 'include' });
            } catch {
                networkErr = true;
            }

            if (resp !== null) {
                if (resp.status === 404 || resp.status === 410) {
                    this.missCache.add(resolvedPath);
                    return NULL;
                }
                if (resp.ok)
                    return new ArrayBufferSlice(await resp.arrayBuffer());
                if (resp.status < 500 && resp.status !== 408 && resp.status !== 429)
                    return NULL;
            }

            if (attempt < maxAttempts - 1) {
                const backoffMs = 100 * Math.pow(3, attempt);
                await new Promise((r) => setTimeout(r, backoffMs));
            } else if (networkErr || (resp && !resp.ok)) {
                console.warn(`[csspak] giving up on ${resolvedPath} after ${maxAttempts} attempts`);
            }
        }
        return NULL;
    }
}

class StubInputManager {
    public isKeyDownEventTriggered(_key: string): boolean { return false; }
    public isKeyDown(_key: string): boolean { return false; }
    public dx = 0;
    public dy = 0;
    public dz = 0;
    public button = 0;
}

const EMPTY_VEC3 = new Float32Array(3);

export class NoclipRenderer {
    private gl: WebGL2RenderingContext;
    private swapChain: GfxSwapChain;
    private device: GfxDevice;

    private camera = new NoclipCamera();
    private renderer: SourceRenderer | null = null;
    private renderContext: SourceRenderContext | null = null;
    private filesystem: SourceFileSystem | null = null;
    private dataShare = new DataShare();
    private dataFetcher: DataFetcher;
    private inputManager = new StubInputManager();
    private destroyablePool: { destroy: (device: GfxDevice) => void }[] = [];

    private startTime = performance.now();
    private lastTime = this.startTime;

    private settings: RenderSettings = { ...DEFAULT_RENDER_SETTINGS };

    public setSettings(settings: RenderSettings): void {
        this.settings = { ...settings };
        this.applySettingsToContext();
    }

    public isAutoExposureSupported(): boolean {
        // The auto-exposure path on WebGL2 polls occlusion query results every
        // frame. Firefox makes gl.getQueryParameter a synchronous GPU-process
        // round-trip, which stalls the JS thread (~75% of frame time in
        // testing) and tanks FPS. The WebGL2 backend already exposes this as
        // occlusionQueriesRecommended; honor it.
        return this.device.queryLimits().occlusionQueriesRecommended;
    }

    private applySettingsToContext(): void {
        if (this.renderContext === null) return;
        const autoExposure = this.settings.autoExposure && this.isAutoExposureSupported();
        this.renderContext.enableBloom = this.settings.bloom;
        this.renderContext.enableAutoExposure = autoExposure;
        this.renderContext.enableFog = !this.settings.disableFog;

        if (this.settings.fullbright) {
            this.renderContext.enableAutoExposure = false;
            this.renderContext.toneMapParams.toneMapScale = 4.0;
        } else if (!autoExposure) {
            this.renderContext.toneMapParams.toneMapScale = 1.0;
        }
    }

    constructor(private canvas: HTMLCanvasElement) {
        // antialias: false — noclip renders to its own offscreen target and
        // blits the resolve to the default framebuffer; a multisampled
        // default FB makes that blit invalid.
        // powerPreference: "high-performance" nudges Safari/iOS off the
        // low-power GPU path; on ProMotion iPhones that path is also where the
        // 60Hz rAF cap tends to stick. Won't help if iOS Low Power Mode is on
        // -- Apple forces 60Hz unconditionally there.
        const gl = canvas.getContext("webgl2", { antialias: false, powerPreference: "high-performance" });
        if (!gl) throw new Error("WebGL2 not supported");
        this.gl = gl;

        const config = new GfxPlatformWebGL2Config();
        this.swapChain = createSwapChainForWebGL2(gl, config);
        this.device = this.swapChain.getDevice();

        this.camera.clipSpaceNearZ = this.device.queryVendorInfo().clipSpaceNearZ;
        // far=Infinity: SkyboxRenderer builds its cube at ±1,000,000 units around
        // the camera, so any finite far plane clips it to nothing.
        this.camera.setPerspective((75 * Math.PI) / 180, 1, 1, Infinity);

        this.dataFetcher = new DataFetcher();
    }

    public async loadBSP(bspBytes: Uint8Array, mapName: string, onPhase: (name: string) => void = () => {}): Promise<void> {
        this.filesystem = new SourceFileSystem(this.dataFetcher);
        const csspak = new CSPakMount();
        this.filesystem.loose.push(csspak);
        (window as { __csspakMisses?: () => string[] }).__csspakMisses = () => {
            const paths = csspak.misses();
            console.log(`[csspak] ${paths.length} miss${paths.length === 1 ? '' : 'es'}:`);
            for (const p of paths) console.log('  ' + p);
            return paths;
        };

        const loadContext = new SourceLoadContext(this.filesystem);
        this.renderContext = new SourceRenderContext(this.device, loadContext);
        this.renderContext.worldLightingState.update(0);

        const sceneContext: SceneContext = {
            device: this.device,
            dataFetcher: this.dataFetcher,
            dataShare: this.dataShare,
            uiContainer: document.createElement("div"),
            destroyablePool: this.destroyablePool,
            inputManager: this.inputManager as never,
            viewerInput: this.makeViewerRenderInput(),
            initialSceneTime: 0,
        };
        this.renderer = new SourceRenderer(sceneContext, this.renderContext);

        // bspBytes came from wasm-bindgen's .slice() copy, so it already owns
        // a fresh, full ArrayBuffer at offset 0. Wrap it directly — copying
        // again here would double-allocate ~2 GB on big maps and OOM the tab.
        const bspSlice = ArrayBufferSlice.fromView(bspBytes);
        const bspFile = new BSPFile(bspSlice, mapName, BSPFileVariant.Default);
        onPhase("bsp lump parse");

        this.renderContext.toneMapParams.toneMapScale = 1.0;
        this.applySettingsToContext();

        if (bspFile.pakfile !== null) this.filesystem.addPakFile(bspFile.pakfile);
        if (bspFile.cubemaps[0] !== undefined)
            await this.renderContext.materialCache.bindLocalCubemap(bspFile.cubemaps[0]);

        const bspRenderer = new BSPRenderer(this.renderContext, bspFile);
        onPhase("bsp renderer build (entities, props)");
        const worldspawn = bspRenderer.getWorldSpawn();
        if (worldspawn.skyname)
            this.renderer.skyboxRenderer = new SkyboxRenderer(
                this.renderContext,
                worldspawn.skyname,
            );
        await bspRenderer.materialsLoaded();
        onPhase("material + texture fetch");
        this.renderer.bspRenderers.push(bspRenderer);
    }

    public render(viewMatrix: mat4, _playerPos: Float32Array, _cameraPos: Float32Array, _showPlayer: boolean): void {
        if (!this.renderer || !this.renderContext) return;
        const now = performance.now();
        const time = (now - this.startTime) / 1000;
        const deltaTime = (now - this.lastTime) / 1000;
        this.lastTime = now;

        this.resize();

        mat4.invert(sourceWorldMatrix, viewMatrix);
        mat4.mul(this.camera.worldMatrix, NOCLIP_FROM_SOURCE, sourceWorldMatrix);
        this.camera.worldMatrixUpdated();

        this.renderContext.globalTime = time;
        this.renderContext.globalDeltaTime = deltaTime;

        const viewerInput = this.makeViewerRenderInput();
        viewerInput.time = time * 1000;
        viewerInput.deltaTime = deltaTime * 1000;
        viewerInput.camera = this.camera;
        viewerInput.onscreenTexture = this.swapChain.getOnscreenTexture();
        viewerInput.backbufferWidth = this.canvas.width;
        viewerInput.backbufferHeight = this.canvas.height;

        this.renderer.render(this.device, viewerInput);
    }

    public renderPreview(viewMatrix: mat4, target: HTMLCanvasElement): void {
        if (!this.renderer || !this.renderContext) return;
        this.render(viewMatrix, EMPTY_VEC3, EMPTY_VEC3, false);
        const ctx = target.getContext("2d");
        if (!ctx) return;
        const src = this.canvas;
        const scale = Math.max(target.width / src.width, target.height / src.height);
        const sw = target.width / scale;
        const sh = target.height / scale;
        ctx.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, target.width, target.height);
    }

    private resize(): void {
        const canvas = this.canvas;
        const dpr = window.devicePixelRatio || 1;
        const w = Math.max(1, canvas.clientWidth * dpr) | 0;
        const h = Math.max(1, canvas.clientHeight * dpr) | 0;
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
        this.swapChain.configureSwapChain(w, h);
        this.camera.aspect = w / h;
        this.camera.setPerspective(this.camera.fovY, this.camera.aspect, 1, Infinity);
    }

    private makeViewerRenderInput(): ViewerRenderInput {
        return {
            camera: this.camera,
            time: 0,
            deltaTime: 0,
            backbufferWidth: this.canvas.width || 1,
            backbufferHeight: this.canvas.height || 1,
            onscreenTexture: null as unknown as GfxTexture,
            antialiasingMode: antialiasingModeFor(this.settings.antialiasing),
            mouseLocation: { mouseX: 0, mouseY: 0 },
            debugConsole: { addInfoLine: () => {} },
        };
    }

    public dispose(): void {
        if (this.renderer) {
            this.renderer.destroy(this.device);
            this.renderer = null;
        }
        for (const d of this.destroyablePool) d.destroy(this.device);
        this.destroyablePool.length = 0;
        const ext = this.gl.getExtension("WEBGL_lose_context");
        if (ext) ext.loseContext();
    }
}
