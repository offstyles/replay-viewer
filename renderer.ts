import { mat4 } from 'gl-matrix';
import type { BspMesh } from './wasm/bhop_replay_viewer_wasm';

// Vertex stride: 14 floats = [x, y, z, nx, ny, nz, lm_u, lm_v, tex_u, tex_v, atlas_min_u, atlas_min_v, atlas_scale_u, atlas_scale_v]
const STRIDE = 14 * 4; // 56 bytes

const MAP_VERT = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aLightmapUV;
attribute vec2 aTexUV;
attribute vec2 aAtlasMin;
attribute vec2 aAtlasScale;
uniform mat4 uProjection;
uniform mat4 uView;
uniform vec3 uCameraPos;
varying vec3 vNormal;
varying vec2 vLightmapUV;
varying vec2 vTexUV;
varying vec2 vAtlasMin;
varying vec2 vAtlasScale;
varying float vDist;
void main() {
  vNormal = aNormal;
  vLightmapUV = aLightmapUV;
  vTexUV = aTexUV;
  vAtlasMin = aAtlasMin;
  vAtlasScale = aAtlasScale;
  vDist = length(aPosition - uCameraPos);
  gl_Position = uProjection * uView * vec4(aPosition, 1.0);
}
`;

const MAP_FRAG = `
#extension GL_OES_standard_derivatives : enable
#extension GL_EXT_shader_texture_lod : enable
precision mediump float;
varying vec3 vNormal;
varying vec2 vLightmapUV;
varying vec2 vTexUV;
varying vec2 vAtlasMin;
varying vec2 vAtlasScale;
varying float vDist;
uniform sampler2D uLightmap;
uniform sampler2D uTexture;
uniform vec2 uAtlasSize;
uniform float uDebugMode;
uniform float uAlphaOverride;
uniform float uTime;
uniform float uIsWater;

const float RGBM_SCALE = 6.0;
const float MAX_SAFE_TEXELS = 8.0; // must match TEX_PAD in bsp.rs

void main() {
  vec3 n = normalize(vNormal);
  if (!gl_FrontFacing) n = -n;

  // Sample base texture with per-pixel tiling
  float hasTex = step(0.001, vAtlasScale.x + vAtlasScale.y);

  vec2 baseTexUV = vTexUV;
  if (uIsWater > 0.5) {
      baseTexUV += vec2(uTime * 0.05, uTime * 0.05);
  }

  // Missing texture: classic Source Engine black & purple checkerboard
  if (hasTex < 0.5) {
    vec2 checker = floor(baseTexUV * 2.0);
    float c = mod(checker.x + checker.y, 2.0);
    vec3 missingColor = mix(vec3(0.0), vec3(0.498, 0.0, 0.498), c);

    // Apply lightmap if available
    if (uDebugMode < 0.5) {
      vec4 lmSample = texture2D(uLightmap, vLightmapUV);
      vec3 lightColor = lmSample.rgb * lmSample.a * RGBM_SCALE;
      float hasLM = step(0.001, vLightmapUV.x + vLightmapUV.y);
      vec3 light = mix(vec3(1.0), lightColor, hasLM);
      
      // Unlit fallback
      if (hasLM < 0.5) {
          vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));
          float ndotl = max(dot(n, lightDir), 0.0);
          float ambient = 0.5;
          light = vec3(1.0) * (ambient + (1.0 - ambient) * ndotl);
      }

      vec3 lit = pow(missingColor, vec3(2.2)) * light;
      missingColor = pow(lit, vec3(1.0 / 2.2));
    }

    gl_FragColor = vec4(missingColor, uAlphaOverride);
    return;
  }

  vec2 rawDdx = dFdx(baseTexUV) * vAtlasScale;
  vec2 rawDdy = dFdy(baseTexUV) * vAtlasScale;

  // Clamp gradients so mip level never exceeds padding coverage
  float maxGrad = MAX_SAFE_TEXELS / max(uAtlasSize.x, uAtlasSize.y);
  float gradLen = max(length(rawDdx), length(rawDdy));
  if (gradLen > maxGrad) {
    float s = maxGrad / gradLen;
    rawDdx *= s;
    rawDdy *= s;
  }

  vec2 tiledUV = fract(baseTexUV);
  vec2 atlasUV = vAtlasMin + tiledUV * vAtlasScale;
  vec4 texColor = texture2DGradEXT(uTexture, atlasUV, rawDdx, rawDdy);

  // Alpha test: discard nearly transparent fragments (cutout textures like fences, grates)
  float alpha = mix(1.0, texColor.a, hasTex);
  if (alpha < 0.1) discard;

  // Debug mode 1: raw texture only (no lightmap, no gamma)
  if (uDebugMode > 0.5) {
    gl_FragColor = vec4(texColor.rgb, alpha * uAlphaOverride);
    return;
  }

  // Linearize base texture (sRGB -> linear) before combining with lightmap
  vec3 texLinear = pow(texColor.rgb, vec3(2.2));
  vec3 albedo = texLinear;

  // Extract flag (negative U = prop) and absolute UV
  float isProp = step(vLightmapUV.x, -0.00005);
  vec2 realLmUV = vec2(abs(vLightmapUV.x), vLightmapUV.y);

  // Sample lightmap (RGBM encoded, already linear)
  vec4 lmSample = texture2D(uLightmap, realLmUV);
  vec3 lightColor = lmSample.rgb * lmSample.a * RGBM_SCALE;

  float hasLM = step(0.001, realLmUV.x + realLmUV.y);
  vec3 light = mix(vec3(1.0), lightColor, hasLM);

  // Apply fake directional lighting for props or unlit geometry
  if (isProp > 0.5 || hasLM < 0.5) {
    vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));
    float ndotl = max(dot(n, lightDir), 0.0);
    float ambient = 0.5;
    vec3 baseLight = isProp > 0.5 ? lightColor : vec3(1.0);
    light = baseLight * (ambient + (1.0 - ambient) * ndotl);
  }

  vec3 color = albedo * light;
  color = pow(color, vec3(1.0 / 2.2));

  gl_FragColor = vec4(color, alpha * uAlphaOverride);
}
`;

const PLAYER_VERT = `
attribute vec3 aPosition;
uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;
void main() {
  gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
}
`;

const PLAYER_FRAG = `
precision mediump float;
void main() {
  gl_FragColor = vec4(0.3, 0.65, 0.4, 1.0);
}
`;

const SKY_VERT = `
attribute vec3 aPosition;
attribute vec2 aUV;
uniform mat4 uProjection;
uniform mat4 uViewRotation;
varying vec2 vUV;
void main() {
  vUV = aUV;
  gl_Position = uProjection * uViewRotation * vec4(aPosition, 1.0);
}
`;

const SKY_FRAG = `
precision mediump float;
varying vec2 vUV;
uniform sampler2D uSkybox;
void main() {
  gl_FragColor = texture2D(uSkybox, vUV);
}
`;

// Depth-only shader for sky face occlusion
const DEPTH_VERT = `
attribute vec3 aPosition;
uniform mat4 uProjection;
uniform mat4 uView;
void main() {
  gl_Position = uProjection * uView * vec4(aPosition, 1.0);
}
`;

const DEPTH_FRAG = `
precision mediump float;
void main() {
  gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
}
`;

// Build 6 skybox quads matching noclip.website's exact vertex positions.
// Atlas layout: 3 columns x 2 rows
//   Row 0: ft(0), bk(1), lf(2)
//   Row 1: rt(3), up(4), dn(5)
function createSkyboxQuads(): { vertices: Float32Array; indices: Uint16Array } {
  const S = 100;
  const eps = 1.0 / 512.0;

  const faces: Array<{ verts: number[][]; localUVs: number[][]; faceIdx: number }> = [
    { // ft (faceIdx 0)
      verts: [[S,-S,-S], [S,-S,S], [-S,-S,S], [-S,-S,-S]],
      localUVs: [[0,1], [0,0], [1,0], [1,1]],
      faceIdx: 0,
    },
    { // bk (faceIdx 1)
      verts: [[-S,S,-S], [-S,S,S], [S,S,S], [S,S,-S]],
      localUVs: [[0,1], [0,0], [1,0], [1,1]],
      faceIdx: 1,
    },
    { // lf (faceIdx 2)
      verts: [[-S,-S,-S], [-S,-S,S], [-S,S,S], [-S,S,-S]],
      localUVs: [[0,1], [0,0], [1,0], [1,1]],
      faceIdx: 2,
    },
    { // rt (faceIdx 3)
      verts: [[S,S,-S], [S,S,S], [S,-S,S], [S,-S,-S]],
      localUVs: [[0,1], [0,0], [1,0], [1,1]],
      faceIdx: 3,
    },
    { // up (faceIdx 4)
      verts: [[S,S,S], [-S,S,S], [-S,-S,S], [S,-S,S]],
      localUVs: [[0,1], [0,0], [1,0], [1,1]],
      faceIdx: 4,
    },
    { // dn (faceIdx 5)
      verts: [[-S,S,-S], [S,S,-S], [S,-S,-S], [-S,-S,-S]],
      localUVs: [[0,1], [0,0], [1,0], [1,1]],
      faceIdx: 5,
    },
  ];

  const vertData: number[] = [];
  const idxs: number[] = [];

  for (const face of faces) {
    const col = face.faceIdx % 3;
    const row = Math.floor(face.faceIdx / 3);
    const base = vertData.length / 5;

    for (let i = 0; i < 4; i++) {
      const [lu, lv] = face.localUVs[i];
      const cu = Math.max(eps, Math.min(1 - eps, lu));
      const cv = Math.max(eps, Math.min(1 - eps, lv));
      const atlasU = col / 3 + cu / 3;
      const atlasV = row / 2 + cv / 2;
      vertData.push(face.verts[i][0], face.verts[i][1], face.verts[i][2], atlasU, atlasV);
    }

    idxs.push(base, base + 1, base + 2);
    idxs.push(base, base + 2, base + 3);
  }

  return { vertices: new Float32Array(vertData), indices: new Uint16Array(idxs) };
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error('Shader compile error: ' + info);
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vert: string, frag: string): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vert);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, frag);
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(prog);
    throw new Error('Program link error: ' + info);
  }
  return prog;
}

function createCubeData(): { vertices: Float32Array; indices: Uint16Array } {
  const s = 8;
  const h = 36;
  const v = [
    -s, -s, 0,   s, -s, 0,   s,  s, 0,  -s,  s, 0,
    -s, -s, h,   s, -s, h,   s,  s, h,  -s,  s, h,
  ];
  const i = [
    0,1,2, 0,2,3,  4,6,5, 4,7,6,  0,4,5, 0,5,1,
    2,6,7, 2,7,3,  0,3,7, 0,7,4,  1,5,6, 1,6,2,
  ];
  return { vertices: new Float32Array(v), indices: new Uint16Array(i) };
}

interface ModelDrawRange {
  indexStart: number;
  indexCount: number;
  cluster: number;
}

export class Renderer {
  private gl: WebGLRenderingContext;
  private mapProgram: WebGLProgram;
  private playerProgram: WebGLProgram;
  private mapVBO: WebGLBuffer;
  private mapIBO: WebGLBuffer;
  private indexCount = 0;
  private playerVBO: WebGLBuffer;
  private playerIBO: WebGLBuffer;
  private playerIndexCount: number;
  private lightmapTexture: WebGLTexture | null = null;
  private baseTexture: WebGLTexture | null = null;
  private anisoExt: any = null;
  private maxAnisotropy = 1;

  // Map uniforms
  private uProjection: WebGLUniformLocation;
  private uView: WebGLUniformLocation;
  private uLightmap: WebGLUniformLocation;
  private uTexture: WebGLUniformLocation;
  private uAtlasSize: WebGLUniformLocation;
  private uDebugMode: WebGLUniformLocation;
  private uAlphaOverride: WebGLUniformLocation;
  private uCameraPos: WebGLUniformLocation;
  
  private uTime: WebGLUniformLocation;
  private uIsWater: WebGLUniformLocation;
  
  private atlasWidth = 0;
  private atlasHeight = 0;
  public debugTexMode = false;

  // Player uniforms
  private puProjection: WebGLUniformLocation;
  private puView: WebGLUniformLocation;
  private puModel: WebGLUniformLocation;

  // Skybox
  private skyboxProgram: WebGLProgram | null = null;
  private skyboxVBO: WebGLBuffer | null = null;
  private skyboxIBO: WebGLBuffer | null = null;
  private skyboxTexture: WebGLTexture | null = null;
  private skyboxIndexCount = 0;
  private suProjection: WebGLUniformLocation | null = null;
  private suViewRot: WebGLUniformLocation | null = null;
  private suSkybox: WebGLUniformLocation | null = null;

  // Sky depth faces (occlusion)
  private depthProgram: WebGLProgram | null = null;
  private skyDepthVBO: WebGLBuffer | null = null;
  private skyDepthIBO: WebGLBuffer | null = null;
  private skyDepthIndexCount = 0;
  private dpProjection: WebGLUniformLocation | null = null;
  private dpView: WebGLUniformLocation | null = null;

  // PVS
  private bspMesh: BspMesh | null = null;
  private modelDrawRanges: ModelDrawRange[] = [];
  private waterDrawRanges: ModelDrawRange[] = [];

  // Animated textures
  private animTextures: { atlasX: number; atlasY: number; width: number; height: number; frameCount: number; fps: number; dataOffset: number; currentFrame: number }[] = [];
  private animFrameData: Uint8Array | null = null;

  readonly projMatrix = mat4.create();
  private playerModelMatrix = mat4.create();

  // Attribute locations (cached)
  private aPos = -1;
  private aNorm = -1;
  private aLmUV = -1;
  private aTexUV = -1;
  private aAtlasMin = -1;
  private aAtlasScale = -1;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', { antialias: true, alpha: false })!;
    if (!gl) throw new Error('WebGL not supported');
    this.gl = gl;

    gl.getExtension('OES_element_index_uint');
    gl.getExtension('OES_standard_derivatives');
    gl.getExtension('EXT_shader_texture_lod');
    this.anisoExt = gl.getExtension('EXT_texture_filter_anisotropic')
      || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic')
      || gl.getExtension('MOZ_EXT_texture_filter_anisotropic');
    if (this.anisoExt) {
      this.maxAnisotropy = gl.getParameter(this.anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
    }
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.clearColor(0.1, 0.1, 0.18, 1.0);

    // Map shader
    this.mapProgram = createProgram(gl, MAP_VERT, MAP_FRAG);
    this.uProjection = gl.getUniformLocation(this.mapProgram, 'uProjection')!;
    this.uView = gl.getUniformLocation(this.mapProgram, 'uView')!;
    this.uLightmap = gl.getUniformLocation(this.mapProgram, 'uLightmap')!;
    this.uTexture = gl.getUniformLocation(this.mapProgram, 'uTexture')!;
    this.uAtlasSize = gl.getUniformLocation(this.mapProgram, 'uAtlasSize')!;
    this.uDebugMode = gl.getUniformLocation(this.mapProgram, 'uDebugMode')!;
    this.uAlphaOverride = gl.getUniformLocation(this.mapProgram, 'uAlphaOverride')!;
    this.uCameraPos = gl.getUniformLocation(this.mapProgram, 'uCameraPos')!;
    
    this.uTime = gl.getUniformLocation(this.mapProgram, 'uTime')!;
    this.uIsWater = gl.getUniformLocation(this.mapProgram, 'uIsWater')!;

    // Cache attribute locations
    this.aPos = gl.getAttribLocation(this.mapProgram, 'aPosition');
    this.aNorm = gl.getAttribLocation(this.mapProgram, 'aNormal');
    this.aLmUV = gl.getAttribLocation(this.mapProgram, 'aLightmapUV');
    this.aTexUV = gl.getAttribLocation(this.mapProgram, 'aTexUV');
    this.aAtlasMin = gl.getAttribLocation(this.mapProgram, 'aAtlasMin');
    this.aAtlasScale = gl.getAttribLocation(this.mapProgram, 'aAtlasScale');

    // Player shader
    this.playerProgram = createProgram(gl, PLAYER_VERT, PLAYER_FRAG);
    this.puProjection = gl.getUniformLocation(this.playerProgram, 'uProjection')!;
    this.puView = gl.getUniformLocation(this.playerProgram, 'uView')!;
    this.puModel = gl.getUniformLocation(this.playerProgram, 'uModel')!;

    // Buffers
    this.mapVBO = gl.createBuffer()!;
    this.mapIBO = gl.createBuffer()!;

    const cube = createCubeData();
    this.playerVBO = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.playerVBO);
    gl.bufferData(gl.ARRAY_BUFFER, cube.vertices, gl.STATIC_DRAW);
    this.playerIBO = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.playerIBO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cube.indices, gl.STATIC_DRAW);
    this.playerIndexCount = cube.indices.length;
  }

  uploadMap(vertices: Float32Array, indices: Uint32Array): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.mapVBO);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mapIBO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    this.indexCount = indices.length;
  }

  setPVS(mesh: BspMesh): void {
    this.bspMesh = mesh;
    const drawData = mesh.model_draw_data();
    const count = mesh.model_draw_count();
    this.modelDrawRanges = [];
    for (let i = 0; i < count; i++) {
      this.modelDrawRanges.push({
        indexStart: drawData[i * 3],
        indexCount: drawData[i * 3 + 1],
        cluster: drawData[i * 3 + 2],
      });
    }
    // Water draw ranges (rendered separately with transparency)
    const waterData = mesh.water_draw_data();
    const waterCount = mesh.water_draw_count();
    this.waterDrawRanges = [];
    for (let i = 0; i < waterCount; i++) {
      this.waterDrawRanges.push({
        indexStart: waterData[i * 3],
        indexCount: waterData[i * 3 + 1],
        cluster: waterData[i * 3 + 2],
      });
    }
  }

  setupAnimatedTextures(info: Float32Array, frameData: Uint8Array): void {
    this.animFrameData = frameData;
    this.animTextures = [];
    const ENTRY_SIZE = 7;
    const count = info.length / ENTRY_SIZE;
    let computedOffset = 0;
    for (let i = 0; i < count; i++) {
      const off = i * ENTRY_SIZE;
      const width = info[off + 2];
      const height = info[off + 3];
      const frameCount = info[off + 4];
      this.animTextures.push({
        atlasX: info[off],
        atlasY: info[off + 1],
        width,
        height,
        frameCount,
        fps: info[off + 5],
        dataOffset: computedOffset,
        currentFrame: -1,
      });
      computedOffset += width * height * 4 * frameCount;
    }
  }

  updateAnimations(time: number): void {
    if (!this.animFrameData || this.animTextures.length === 0) return;
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.baseTexture);
    let updated = 0;
    for (const anim of this.animTextures) {
      const frame = Math.floor(time * anim.fps) % anim.frameCount;
      if (frame === anim.currentFrame) continue;
      anim.currentFrame = frame;
      const frameBytes = anim.width * anim.height * 4;
      const offset = anim.dataOffset + frame * frameBytes;
      const pixels = new Uint8Array(this.animFrameData.buffer, this.animFrameData.byteOffset + offset, frameBytes);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, anim.atlasX, anim.atlasY, anim.width, anim.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      updated++;
    }
    if (updated > 0) {
      gl.generateMipmap(gl.TEXTURE_2D);
    }
  }

  uploadLightmap(data: Uint8Array, width: number, height: number): void {
    const gl = this.gl;
    this.lightmapTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.lightmapTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  uploadTextureAtlas(data: Uint8Array, width: number, height: number): void {
    const gl = this.gl;
    this.atlasWidth = width;
    this.atlasHeight = height;
    this.baseTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.baseTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (this.anisoExt) {
      gl.texParameterf(gl.TEXTURE_2D, this.anisoExt.TEXTURE_MAX_ANISOTROPY_EXT, this.maxAnisotropy);
    }
  }

  /** Patch a region of the texture atlas (for external texture loading). Caller must include tiling padding. */
  patchTextureAtlas(x: number, y: number, width: number, height: number, data: Uint8Array): void {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.baseTexture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  uploadSkybox(data: Uint8Array, faceSize: number): void {
    const gl = this.gl;

    // Build skybox shader + geometry
    this.skyboxProgram = createProgram(gl, SKY_VERT, SKY_FRAG);
    this.suProjection = gl.getUniformLocation(this.skyboxProgram, 'uProjection');
    this.suViewRot = gl.getUniformLocation(this.skyboxProgram, 'uViewRotation');
    this.suSkybox = gl.getUniformLocation(this.skyboxProgram, 'uSkybox');

    const quads = createSkyboxQuads();
    this.skyboxVBO = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.skyboxVBO);
    gl.bufferData(gl.ARRAY_BUFFER, quads.vertices, gl.STATIC_DRAW);
    this.skyboxIBO = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.skyboxIBO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, quads.indices, gl.STATIC_DRAW);
    this.skyboxIndexCount = quads.indices.length;

    // Build 3x2 atlas from 6 concatenated face images
    const atlasW = faceSize * 3;
    const atlasH = faceSize * 2;
    const faceBytes = faceSize * faceSize * 4;
    const atlas = new Uint8Array(atlasW * atlasH * 4);
    for (let fi = 0; fi < 6; fi++) {
      const col = fi % 3;
      const row = Math.floor(fi / 3);
      const ox = col * faceSize;
      const oy = row * faceSize;
      const srcOff = fi * faceBytes;
      for (let y = 0; y < faceSize; y++) {
        const srcRow = srcOff + y * faceSize * 4;
        const dstRow = ((oy + y) * atlasW + ox) * 4;
        atlas.set(data.subarray(srcRow, srcRow + faceSize * 4), dstRow);
      }
    }

    this.skyboxTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.skyboxTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, atlasW, atlasH, 0, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  uploadSkyDepth(vertices: Float32Array, indices: Uint32Array): void {
    const gl = this.gl;
    this.depthProgram = createProgram(gl, DEPTH_VERT, DEPTH_FRAG);
    this.dpProjection = gl.getUniformLocation(this.depthProgram, 'uProjection');
    this.dpView = gl.getUniformLocation(this.depthProgram, 'uView');

    this.skyDepthVBO = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.skyDepthVBO);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    this.skyDepthIBO = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.skyDepthIBO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    this.skyDepthIndexCount = indices.length;
  }

  resize(): void {
    const canvas = this.canvas;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth * dpr;
    const h = canvas.clientHeight * dpr;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    this.gl.viewport(0, 0, canvas.width, canvas.height);
    mat4.perspective(this.projMatrix, 80 * Math.PI / 180, w / h, 1, 65536);
  }

  render(viewMatrix: mat4, playerPos: Float32Array, showPlayer: boolean = true): void {
    const gl = this.gl;
    this.resize();

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Draw skybox first (depth test OFF so it fills background)
    if (this.skyboxTexture && this.skyboxProgram) {
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
      gl.useProgram(this.skyboxProgram);
      gl.uniformMatrix4fv(this.suProjection, false, this.projMatrix);

      // View matrix with translation removed (rotation only)
      const viewRot = mat4.clone(viewMatrix);
      viewRot[12] = 0; viewRot[13] = 0; viewRot[14] = 0;
      gl.uniformMatrix4fv(this.suViewRot, false, viewRot);

      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.skyboxTexture);
      gl.uniform1i(this.suSkybox, 2);

      // Stride: 5 floats (pos3 + uv2) = 20 bytes
      gl.bindBuffer(gl.ARRAY_BUFFER, this.skyboxVBO!);
      const sPos = gl.getAttribLocation(this.skyboxProgram, 'aPosition');
      const sUV = gl.getAttribLocation(this.skyboxProgram, 'aUV');
      gl.enableVertexAttribArray(sPos);
      gl.vertexAttribPointer(sPos, 3, gl.FLOAT, false, 20, 0);
      gl.enableVertexAttribArray(sUV);
      gl.vertexAttribPointer(sUV, 2, gl.FLOAT, false, 20, 12);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.skyboxIBO!);
      gl.drawElements(gl.TRIANGLES, this.skyboxIndexCount, gl.UNSIGNED_SHORT, 0);

      gl.disableVertexAttribArray(sPos);
      gl.disableVertexAttribArray(sUV);
      gl.depthMask(true);
      gl.enable(gl.DEPTH_TEST);
    }

    // Draw sky faces depth-only (occlusion barrier so geometry behind sky isn't visible)
    if (this.depthProgram && this.skyDepthIndexCount > 0) {
      gl.useProgram(this.depthProgram);
      gl.uniformMatrix4fv(this.dpProjection, false, this.projMatrix);
      gl.uniformMatrix4fv(this.dpView, false, viewMatrix);
      gl.colorMask(false, false, false, false);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.skyDepthVBO!);
      const dpPos = gl.getAttribLocation(this.depthProgram, 'aPosition');
      gl.enableVertexAttribArray(dpPos);
      gl.vertexAttribPointer(dpPos, 3, gl.FLOAT, false, 12, 0);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.skyDepthIBO!);
      gl.drawElements(gl.TRIANGLES, this.skyDepthIndexCount, gl.UNSIGNED_INT, 0);

      gl.disableVertexAttribArray(dpPos);
      gl.colorMask(true, true, true, true);
    }

    if (this.indexCount === 0) return;

    // Enable alpha blending for transparent textures (fences, grates, glass, etc.)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Draw map
    gl.useProgram(this.mapProgram);
    gl.uniformMatrix4fv(this.uProjection, false, this.projMatrix);
    gl.uniformMatrix4fv(this.uView, false, viewMatrix);
    gl.uniform3f(this.uCameraPos, playerPos[0], playerPos[1], playerPos[2]);
    gl.uniform1f(this.uTime, performance.now() / 1000.0);

    // Bind lightmap on unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.lightmapTexture);
    gl.uniform1i(this.uLightmap, 0);

    // Bind texture atlas on unit 1
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.baseTexture);
    gl.uniform1i(this.uTexture, 1);
    gl.uniform2f(this.uAtlasSize, this.atlasWidth, this.atlasHeight);
    gl.uniform1f(this.uDebugMode, this.debugTexMode ? 1.0 : 0.0);
    gl.uniform1f(this.uAlphaOverride, 1.0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.mapVBO);
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, STRIDE, 0);
    gl.enableVertexAttribArray(this.aNorm);
    gl.vertexAttribPointer(this.aNorm, 3, gl.FLOAT, false, STRIDE, 12);
    gl.enableVertexAttribArray(this.aLmUV);
    gl.vertexAttribPointer(this.aLmUV, 2, gl.FLOAT, false, STRIDE, 24);
    gl.enableVertexAttribArray(this.aTexUV);
    gl.vertexAttribPointer(this.aTexUV, 2, gl.FLOAT, false, STRIDE, 32);
    gl.enableVertexAttribArray(this.aAtlasMin);
    gl.vertexAttribPointer(this.aAtlasMin, 2, gl.FLOAT, false, STRIDE, 40);
    gl.enableVertexAttribArray(this.aAtlasScale);
    gl.vertexAttribPointer(this.aAtlasScale, 2, gl.FLOAT, false, STRIDE, 48);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mapIBO);

    // PVS-based per-cluster draw calls (opaque geometry)
    if (this.bspMesh && this.modelDrawRanges.length > 0) {
      gl.uniform1f(this.uIsWater, 0.0);
      const camCluster = this.bspMesh.find_cluster(playerPos[0], playerPos[1], playerPos[2]);
      for (let i = 0; i < this.modelDrawRanges.length; i++) {
        const m = this.modelDrawRanges[i];
        if (m.indexCount === 0) continue;
        // cluster -1 = unknown, always draw; otherwise PVS check
        if (m.cluster < 0 || this.bspMesh.is_cluster_visible(camCluster, m.cluster)) {
          gl.drawElements(gl.TRIANGLES, m.indexCount, gl.UNSIGNED_INT, m.indexStart * 4);
        }
      }

      // Water pass: render with transparency, no depth write
      if (this.waterDrawRanges.length > 0) {
        gl.depthMask(false);
        gl.uniform1f(this.uAlphaOverride, 0.6);
        gl.uniform1f(this.uIsWater, 1.0);
        for (let i = 0; i < this.waterDrawRanges.length; i++) {
          const m = this.waterDrawRanges[i];
          if (m.indexCount === 0) continue;
          if (m.cluster < 0 || this.bspMesh.is_cluster_visible(camCluster, m.cluster)) {
            gl.drawElements(gl.TRIANGLES, m.indexCount, gl.UNSIGNED_INT, m.indexStart * 4);
          }
        }
        gl.depthMask(true);
        gl.uniform1f(this.uAlphaOverride, 1.0);
        gl.uniform1f(this.uIsWater, 0.0);
      }
    } else {
      gl.uniform1f(this.uIsWater, 0.0);
      gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_INT, 0);
    }

    gl.disableVertexAttribArray(this.aNorm);
    gl.disableVertexAttribArray(this.aLmUV);
    gl.disableVertexAttribArray(this.aTexUV);
    gl.disableVertexAttribArray(this.aAtlasMin);
    gl.disableVertexAttribArray(this.aAtlasScale);

    // Disable blending for subsequent draws (player cube, etc.)
    gl.disable(gl.BLEND);

    // Draw player cube (only in freecam)
    if (showPlayer) {
      gl.useProgram(this.playerProgram);
      gl.uniformMatrix4fv(this.puProjection, false, this.projMatrix);
      gl.uniformMatrix4fv(this.puView, false, viewMatrix);

      mat4.identity(this.playerModelMatrix);
      mat4.translate(this.playerModelMatrix, this.playerModelMatrix, [
        playerPos[0], playerPos[1], playerPos[2],
      ]);
      gl.uniformMatrix4fv(this.puModel, false, this.playerModelMatrix);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.playerVBO);
      const pPos = gl.getAttribLocation(this.playerProgram, 'aPosition');
      gl.enableVertexAttribArray(pPos);
      gl.vertexAttribPointer(pPos, 3, gl.FLOAT, false, 12, 0);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.playerIBO);
      gl.drawElements(gl.TRIANGLES, this.playerIndexCount, gl.UNSIGNED_SHORT, 0);

      gl.disableVertexAttribArray(pPos);
    }
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteBuffer(this.mapVBO);
    gl.deleteBuffer(this.mapIBO);
    gl.deleteBuffer(this.playerVBO);
    gl.deleteBuffer(this.playerIBO);
    if (this.lightmapTexture) gl.deleteTexture(this.lightmapTexture);
    if (this.baseTexture) gl.deleteTexture(this.baseTexture);
    if (this.skyboxTexture) gl.deleteTexture(this.skyboxTexture);
    if (this.skyboxVBO) gl.deleteBuffer(this.skyboxVBO);
    if (this.skyboxIBO) gl.deleteBuffer(this.skyboxIBO);
    if (this.skyDepthVBO) gl.deleteBuffer(this.skyDepthVBO);
    if (this.skyDepthIBO) gl.deleteBuffer(this.skyDepthIBO);
    gl.deleteProgram(this.mapProgram);
    gl.deleteProgram(this.playerProgram);
    if (this.skyboxProgram) gl.deleteProgram(this.skyboxProgram);
    if (this.depthProgram) gl.deleteProgram(this.depthProgram);
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
  }
}
