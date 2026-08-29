import { vec3, type ReadonlyVec3 } from "gl-matrix";

import { AABB } from "./noclip/Geometry.js";
import { DeviceProgram } from "./noclip/Program.js";
import type { BSPFile } from "./noclip/SourceEngine/BSPFile.js";
import type { SourceEngineView } from "./noclip/SourceEngine/Main.js";
import { GfxShaderLibrary } from "./noclip/gfx/helpers/GfxShaderLibrary.js";
import { fillMatrix4x4 } from "./noclip/gfx/helpers/UniformBufferHelpers.js";
import {
    GfxBufferUsage,
    GfxCullMode,
    GfxFormat,
    GfxVertexBufferFrequency,
    type GfxBindingLayoutDescriptor,
    type GfxInputLayout,
    type GfxProgram,
} from "./noclip/gfx/platform/GfxPlatform.js";
import type { GfxRenderCache } from "./noclip/gfx/render/GfxRenderCache.js";
import type { GfxRenderInstManager } from "./noclip/gfx/render/GfxRenderInstManager.js";
import type { Zone, ZoneType } from "./zones";

class ZoneProgram extends DeviceProgram {
    public override both = `
${GfxShaderLibrary.MatrixLibrary}

layout(std140) uniform ub_Params {
    Mat4x4 u_ClipFromWorld;
};
`;

    public override vert = `
layout(location = 0) in vec3 a_Position;
layout(location = 1) in vec3 a_Color;

out vec3 v_Color;

void main() {
    gl_Position = UnpackMatrix(u_ClipFromWorld) * vec4(a_Position, 1.0);
    v_Color = a_Color;
}
`;

    public override frag = `
in vec3 v_Color;

void main() {
    gl_FragColor = vec4(v_Color, 1.0);
}
`;
}

const bindingLayouts: GfxBindingLayoutDescriptor[] = [{ numUniformBuffers: 1, numSamplers: 0 }];

// bhoptimer's default zone beam colors and width.
const ZONE_COLORS: Record<ZoneType, [number, number, number]> = {
    start: [67 / 255, 210 / 255, 230 / 255],
    end: [165 / 255, 19 / 255, 194 / 255],
};
const BEAM_HALF_WIDTH = 0.25;

const BOX_EDGES = [
    [0, 1], [1, 3], [3, 2], [2, 0],
    [4, 5], [5, 7], [7, 6], [6, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
];
const FLOATS_PER_VERTEX = 6;
const VERTICES_PER_BOX = BOX_EDGES.length * 6;

interface ZoneBox {
    aabb: AABB;
    corners: vec3[];
    color: [number, number, number];
}

const scratchMid = vec3.create();
const scratchToCam = vec3.create();
const scratchDir = vec3.create();
const scratchSide = vec3.create();
const scratchCorner = vec3.create();

export class ZoneRenderer {
    private program: GfxProgram;
    private inputLayout: GfxInputLayout;
    private boxes: ZoneBox[] = [];
    private vertexData = new Float32Array(0);
    private vertexCount = 0;

    constructor(private cache: GfxRenderCache) {
        this.program = cache.createProgram(new ZoneProgram());
        this.inputLayout = cache.createInputLayout({
            indexBufferFormat: null,
            vertexAttributeDescriptors: [
                { location: 0, format: GfxFormat.F32_RGB, bufferIndex: 0, bufferByteOffset: 0 },
                { location: 1, format: GfxFormat.F32_RGB, bufferIndex: 0, bufferByteOffset: 3 * 4 },
            ],
            vertexBufferDescriptors: [
                { byteStride: FLOATS_PER_VERTEX * 4, frequency: GfxVertexBufferFrequency.PerVertex },
            ],
        });
    }

    public setZones(zones: Zone[]): void {
        this.boxes = zones.map((z) => ({
            aabb: new AABB(z.min[0], z.min[1], z.min[2], z.max[0], z.max[1], z.max[2]),
            corners: Array.from({ length: 8 }, (_, i) => vec3.fromValues(
                (i & 1) ? z.min[0] : z.max[0],
                (i & 2) ? z.min[1] : z.max[1],
                (i & 4) ? z.min[2] : z.max[2],
            )),
            color: ZONE_COLORS[z.type],
        }));
        this.vertexData = new Float32Array(this.boxes.length * VERTICES_PER_BOX * FLOATS_PER_VERTEX);
    }

    // Edges are quads facing the camera with a world-space width, like Source
    // beams, but never thinner than one pixel so distant zones don't dissolve.
    // Sky brushes leave no depth, so like entities, zones are culled by PVS.
    public prepareToRender(renderInstManager: GfxRenderInstManager, view: SourceEngineView, bsp: BSPFile, pixelsPerUnitAtDist1: number): void {
        if (this.boxes.length === 0) return;

        this.vertexCount = 0;
        for (const box of this.boxes) {
            if (!view.frustum.contains(box.aabb) || !bsp.pvsTouchesAABB(box.aabb, view.pvs))
                continue;
            for (const [a, b] of BOX_EDGES)
                this.emitBeam(box.corners[a], box.corners[b], box.color, view.cameraPos, pixelsPerUnitAtDist1);
        }
        if (this.vertexCount === 0) return;

        const bytes = new Uint8Array(this.vertexData.buffer, 0, this.vertexCount * FLOATS_PER_VERTEX * 4);
        const vertexBuffer = this.cache.dynamicBufferCache.allocateData(GfxBufferUsage.Vertex, bytes);

        const renderInst = renderInstManager.newRenderInst();
        renderInst.setBindingLayouts(bindingLayouts);
        renderInst.setGfxProgram(this.program);
        renderInst.setVertexInput(this.inputLayout, [vertexBuffer], null);
        renderInst.setMegaStateFlags({ cullMode: GfxCullMode.None });
        renderInst.setDrawCount(this.vertexCount);
        const offs = renderInst.allocateUniformBuffer(0, 16);
        fillMatrix4x4(renderInst.mapUniformBufferF32(0), offs, view.clipFromWorldMatrix);
        view.mainList.submitRenderInst(renderInst);
    }

    private emitBeam(p0: ReadonlyVec3, p1: ReadonlyVec3, color: [number, number, number], cameraPos: ReadonlyVec3, pixelsPerUnitAtDist1: number): void {
        vec3.lerp(scratchMid, p0, p1, 0.5);
        vec3.sub(scratchToCam, cameraPos, scratchMid);
        vec3.sub(scratchDir, p1, p0);
        vec3.cross(scratchSide, scratchDir, scratchToCam);
        const sideLen = vec3.len(scratchSide);
        if (sideLen === 0) return;
        const dist = vec3.len(scratchToCam);
        const halfWidth = Math.max(BEAM_HALF_WIDTH, 0.5 * dist / pixelsPerUnitAtDist1);
        vec3.scale(scratchSide, scratchSide, halfWidth / sideLen);

        this.emitVertex(p0, -1, color);
        this.emitVertex(p0, 1, color);
        this.emitVertex(p1, 1, color);
        this.emitVertex(p0, -1, color);
        this.emitVertex(p1, 1, color);
        this.emitVertex(p1, -1, color);
    }

    private emitVertex(p: ReadonlyVec3, sideSign: number, color: [number, number, number]): void {
        vec3.scaleAndAdd(scratchCorner, p, scratchSide, sideSign);
        const o = this.vertexCount * FLOATS_PER_VERTEX;
        this.vertexData[o + 0] = scratchCorner[0];
        this.vertexData[o + 1] = scratchCorner[1];
        this.vertexData[o + 2] = scratchCorner[2];
        this.vertexData[o + 3] = color[0];
        this.vertexData[o + 4] = color[1];
        this.vertexData[o + 5] = color[2];
        this.vertexCount++;
    }
}
