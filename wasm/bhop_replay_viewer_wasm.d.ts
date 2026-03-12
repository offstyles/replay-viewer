/* tslint:disable */
/* eslint-disable */

export class BspMesh {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Animated texture frame data (all frames for all animated textures, concatenated)
     */
    animated_frame_data(): Uint8Array;
    /**
     * Animated texture metadata: [atlas_x, atlas_y, width, height, frame_count, fps, data_byte_offset] per texture
     */
    animated_texture_info(): Float32Array;
    /**
     * Find the cluster for a world position (for camera PVS lookup)
     */
    find_cluster(x: number, y: number, z: number): number;
    has_sky_faces(): boolean;
    has_skybox(): boolean;
    index_count(): number;
    index_data(): Uint32Array;
    /**
     * Check if cluster `to` is visible from cluster `from`
     */
    is_cluster_visible(from: number, to: number): boolean;
    lightmap_atlas_data(): Uint8Array;
    lightmap_height(): number;
    lightmap_width(): number;
    /**
     * JSON array of missing prop model paths: ["models/props/foo.mdl", ...]
     */
    missing_props(): string;
    /**
     * Number of drawable models (call before model_draw_data)
     */
    model_draw_count(): number;
    /**
     * Returns per-model draw info as flat array: [index_start, index_count, cluster] * N
     */
    model_draw_data(): Int32Array;
    sky_index_data(): Uint32Array;
    /**
     * Sky face positions [x,y,z] for depth-only rendering
     */
    sky_vertex_data(): Float32Array;
    skybox_data(): Uint8Array;
    skybox_face_size(): number;
    texture_atlas_data(): Uint8Array;
    texture_atlas_height(): number;
    texture_atlas_width(): number;
    /**
     * JSON array of unresolved texture info: [{name, atlas_x, atlas_y, width, height, pad}, ...]
     */
    unresolved_textures(): string;
    vertex_count(): number;
    /**
     * Move vertex data out (avoids clone). Field becomes empty after call.
     */
    vertex_data(): Float32Array;
    /**
     * Number of water draw ranges (call before water_draw_data)
     */
    water_draw_count(): number;
    /**
     * Water draw ranges: same format as model_draw_data but for water faces
     */
    water_draw_data(): Int32Array;
}

export class ReplayData {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    angles(): Float32Array;
    buttons_array(): Int32Array;
    flags_array(): Int32Array;
    map_name(): string;
    positions(): Float32Array;
    preframes(): number;
    tick_count(): number;
    tick_rate(): number;
    time(): number;
}

/**
 * Decode a VTF file, downscale to target dimensions, apply color tint, create tiled version with padding.
 * Returns RGBA data of size (target_w + 2*pad) × (target_h + 2*pad) × 4, ready for texSubImage2D.
 * When force_opaque is true, all alpha values are set to 255 (most Source textures use alpha
 * for specular masks etc., not actual transparency).
 */
export function decode_and_tile_vtf(vtf_data: Uint8Array, target_w: number, target_h: number, color_r: number, color_g: number, color_b: number, force_opaque: boolean): Uint8Array | undefined;

export function decompress_bz2(data: Uint8Array): Uint8Array;

export function init(): void;

export function parse_bsp(data: Uint8Array): BspMesh;

/**
 * Parse a BSP with extra files injected (e.g. prop models from VPK).
 * `extras_json` is a JSON array of `{"path":"models/foo.mdl","offset":0,"length":1234}`.
 * `extras_data` is all the file contents concatenated.
 */
export function parse_bsp_with_extras(data: Uint8Array, extras_json: string, extras_data: Uint8Array): BspMesh;

export function parse_replay(data: Uint8Array): ReplayData;

/**
 * Parse a VMT file and return JSON: {"basetexture":"...", "color":[r,g,b], "fps":0, "is_water":false}
 */
export function parse_vmt_data(data: Uint8Array): string | undefined;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_bspmesh_free: (a: number, b: number) => void;
    readonly bspmesh_animated_frame_data: (a: number) => [number, number];
    readonly bspmesh_animated_texture_info: (a: number) => [number, number];
    readonly bspmesh_find_cluster: (a: number, b: number, c: number, d: number) => number;
    readonly bspmesh_has_sky_faces: (a: number) => number;
    readonly bspmesh_has_skybox: (a: number) => number;
    readonly bspmesh_index_count: (a: number) => number;
    readonly bspmesh_index_data: (a: number) => [number, number];
    readonly bspmesh_is_cluster_visible: (a: number, b: number, c: number) => number;
    readonly bspmesh_lightmap_atlas_data: (a: number) => [number, number];
    readonly bspmesh_lightmap_height: (a: number) => number;
    readonly bspmesh_lightmap_width: (a: number) => number;
    readonly bspmesh_missing_props: (a: number) => [number, number];
    readonly bspmesh_model_draw_count: (a: number) => number;
    readonly bspmesh_model_draw_data: (a: number) => [number, number];
    readonly bspmesh_sky_index_data: (a: number) => [number, number];
    readonly bspmesh_sky_vertex_data: (a: number) => [number, number];
    readonly bspmesh_skybox_data: (a: number) => [number, number];
    readonly bspmesh_skybox_face_size: (a: number) => number;
    readonly bspmesh_texture_atlas_data: (a: number) => [number, number];
    readonly bspmesh_texture_atlas_height: (a: number) => number;
    readonly bspmesh_texture_atlas_width: (a: number) => number;
    readonly bspmesh_unresolved_textures: (a: number) => [number, number];
    readonly bspmesh_vertex_count: (a: number) => number;
    readonly bspmesh_vertex_data: (a: number) => [number, number];
    readonly bspmesh_water_draw_count: (a: number) => number;
    readonly bspmesh_water_draw_data: (a: number) => [number, number];
    readonly parse_bsp: (a: number, b: number) => [number, number, number];
    readonly parse_bsp_with_extras: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
    readonly __wbg_replaydata_free: (a: number, b: number) => void;
    readonly parse_replay: (a: number, b: number) => [number, number, number];
    readonly replaydata_angles: (a: number) => [number, number];
    readonly replaydata_buttons_array: (a: number) => [number, number];
    readonly replaydata_flags_array: (a: number) => [number, number];
    readonly replaydata_map_name: (a: number) => [number, number];
    readonly replaydata_positions: (a: number) => [number, number];
    readonly replaydata_preframes: (a: number) => number;
    readonly replaydata_tick_count: (a: number) => number;
    readonly replaydata_tick_rate: (a: number) => number;
    readonly replaydata_time: (a: number) => number;
    readonly decode_and_tile_vtf: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number];
    readonly init: () => void;
    readonly parse_vmt_data: (a: number, b: number) => [number, number];
    readonly decompress_bz2: (a: number, b: number) => [number, number, number, number];
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
