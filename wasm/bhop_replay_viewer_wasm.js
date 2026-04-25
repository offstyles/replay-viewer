/* @ts-self-types="./bhop_replay_viewer_wasm.d.ts" */

export class BspMesh {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(BspMesh.prototype);
        obj.__wbg_ptr = ptr;
        BspMeshFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BspMeshFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_bspmesh_free(ptr, 0);
    }
    /**
     * Animated texture frame data (all frames for all animated textures, concatenated)
     * @returns {Uint8Array}
     */
    animated_frame_data() {
        const ret = wasm.bspmesh_animated_frame_data(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Animated texture metadata: [atlas_x, atlas_y, width, height, frame_count, fps, data_byte_offset] per texture
     * @returns {Float32Array}
     */
    animated_texture_info() {
        const ret = wasm.bspmesh_animated_texture_info(this.__wbg_ptr);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Find the cluster for a world position (for camera PVS lookup)
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {number}
     */
    find_cluster(x, y, z) {
        const ret = wasm.bspmesh_find_cluster(this.__wbg_ptr, x, y, z);
        return ret;
    }
    /**
     * @returns {boolean}
     */
    has_sky_faces() {
        const ret = wasm.bspmesh_has_sky_faces(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {boolean}
     */
    has_skybox() {
        const ret = wasm.bspmesh_has_skybox(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    index_count() {
        const ret = wasm.bspmesh_index_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {Uint32Array}
     */
    index_data() {
        const ret = wasm.bspmesh_index_data(this.__wbg_ptr);
        var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Check if cluster `to` is visible from cluster `from`
     * @param {number} from
     * @param {number} to
     * @returns {boolean}
     */
    is_cluster_visible(from, to) {
        const ret = wasm.bspmesh_is_cluster_visible(this.__wbg_ptr, from, to);
        return ret !== 0;
    }
    /**
     * @returns {Uint8Array}
     */
    lightmap_atlas_data() {
        const ret = wasm.bspmesh_lightmap_atlas_data(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {number}
     */
    lightmap_height() {
        const ret = wasm.bspmesh_lightmap_height(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    lightmap_width() {
        const ret = wasm.bspmesh_lightmap_width(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * JSON array of missing prop model paths: ["models/props/foo.mdl", ...]
     * @returns {string}
     */
    missing_props() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.bspmesh_missing_props(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Number of drawable models (call before model_draw_data)
     * @returns {number}
     */
    model_draw_count() {
        const ret = wasm.bspmesh_model_draw_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Returns per-model draw info as flat array: [index_start, index_count, cluster] * N
     * @returns {Int32Array}
     */
    model_draw_data() {
        const ret = wasm.bspmesh_model_draw_data(this.__wbg_ptr);
        var v1 = getArrayI32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {Uint32Array}
     */
    sky_index_data() {
        const ret = wasm.bspmesh_sky_index_data(this.__wbg_ptr);
        var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Sky face positions [x,y,z] for depth-only rendering
     * @returns {Float32Array}
     */
    sky_vertex_data() {
        const ret = wasm.bspmesh_sky_vertex_data(this.__wbg_ptr);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {Uint8Array}
     */
    skybox_data() {
        const ret = wasm.bspmesh_skybox_data(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {number}
     */
    skybox_face_size() {
        const ret = wasm.bspmesh_skybox_face_size(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Skybox basename from worldspawn (e.g. "sky_dust", "militia_hdr"). Empty
     * when the map has no skyname. Always set, even if faces aren't in the pakfile.
     * @returns {string}
     */
    skybox_name() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.bspmesh_skybox_name(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {Uint8Array}
     */
    texture_atlas_data() {
        const ret = wasm.bspmesh_texture_atlas_data(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {number}
     */
    texture_atlas_height() {
        const ret = wasm.bspmesh_texture_atlas_height(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    texture_atlas_width() {
        const ret = wasm.bspmesh_texture_atlas_width(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Per-range center coords [cx, cy, cz] for back-to-front sorting
     * @returns {Float32Array}
     */
    translucent_centers() {
        const ret = wasm.bspmesh_translucent_centers(this.__wbg_ptr);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Number of translucent draw ranges
     * @returns {number}
     */
    translucent_draw_count() {
        const ret = wasm.bspmesh_translucent_draw_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Translucent draw ranges: same format, for translucent faces
     * @returns {Int32Array}
     */
    translucent_draw_data() {
        const ret = wasm.bspmesh_translucent_draw_data(this.__wbg_ptr);
        var v1 = getArrayI32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * JSON array of unresolved texture info: [{name, atlas_x, atlas_y, width, height, pad}, ...]
     * @returns {string}
     */
    unresolved_textures() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.bspmesh_unresolved_textures(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {number}
     */
    vertex_count() {
        const ret = wasm.bspmesh_vertex_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Move vertex data out (avoids clone). Field becomes empty after call.
     * @returns {Float32Array}
     */
    vertex_data() {
        const ret = wasm.bspmesh_vertex_data(this.__wbg_ptr);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Number of water draw ranges (call before water_draw_data)
     * @returns {number}
     */
    water_draw_count() {
        const ret = wasm.bspmesh_water_draw_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Water draw ranges: same format as model_draw_data but for water faces
     * @returns {Int32Array}
     */
    water_draw_data() {
        const ret = wasm.bspmesh_water_draw_data(this.__wbg_ptr);
        var v1 = getArrayI32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
}
if (Symbol.dispose) BspMesh.prototype[Symbol.dispose] = BspMesh.prototype.free;

export class ReplayData {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ReplayData.prototype);
        obj.__wbg_ptr = ptr;
        ReplayDataFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ReplayDataFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_replaydata_free(ptr, 0);
    }
    /**
     * @returns {Float32Array}
     */
    angles() {
        const ret = wasm.replaydata_angles(this.__wbg_ptr);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {Int32Array}
     */
    buttons_array() {
        const ret = wasm.replaydata_buttons_array(this.__wbg_ptr);
        var v1 = getArrayI32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {Int32Array}
     */
    flags_array() {
        const ret = wasm.replaydata_flags_array(this.__wbg_ptr);
        var v1 = getArrayI32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {string}
     */
    map_name() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.replaydata_map_name(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {Float32Array}
     */
    positions() {
        const ret = wasm.replaydata_positions(this.__wbg_ptr);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {number}
     */
    preframes() {
        const ret = wasm.replaydata_preframes(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    tick_count() {
        const ret = wasm.replaydata_tick_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    tick_rate() {
        const ret = wasm.replaydata_tick_rate(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    time() {
        const ret = wasm.replaydata_time(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) ReplayData.prototype[Symbol.dispose] = ReplayData.prototype.free;

/**
 * Cubemap data produced by `build_skybox_from_vtfs`: 6 RGBA faces concatenated.
 */
export class SkyboxResult {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(SkyboxResult.prototype);
        obj.__wbg_ptr = ptr;
        SkyboxResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SkyboxResultFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_skyboxresult_free(ptr, 0);
    }
    /**
     * @returns {Uint8Array}
     */
    data() {
        const ret = wasm.skyboxresult_data(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {number}
     */
    face_size() {
        const ret = wasm.skyboxresult_face_size(this.__wbg_ptr);
        return ret >>> 0;
    }
}
if (Symbol.dispose) SkyboxResult.prototype[Symbol.dispose] = SkyboxResult.prototype.free;

/**
 * Decode 6 skybox face VTFs (fetched externally, e.g. from a CS:S VPK) into a
 * cubemap matching what `BspMesh::skybox_data` would have produced if the VTFs
 * had been embedded in the BSP pakfile.
 *
 * `face_offsets` and `face_lengths` index into `vtfs_data` and must each have
 * length 6 in the order [ft, bk, lf, rt, up, dn]. A length of 0 means that
 * face is missing (it's filled with opaque black so the cubemap is complete).
 * Returns None if no faces could be decoded.
 * @param {Uint8Array} vtfs_data
 * @param {Uint32Array} face_offsets
 * @param {Uint32Array} face_lengths
 * @returns {SkyboxResult | undefined}
 */
export function build_skybox_from_vtfs(vtfs_data, face_offsets, face_lengths) {
    const ptr0 = passArray8ToWasm0(vtfs_data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray32ToWasm0(face_offsets, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray32ToWasm0(face_lengths, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.build_skybox_from_vtfs(ptr0, len0, ptr1, len1, ptr2, len2);
    return ret === 0 ? undefined : SkyboxResult.__wrap(ret);
}

/**
 * Decode a VTF file, downscale to target dimensions, apply color tint, create tiled version with padding.
 * Returns RGBA data of size (target_w + 2*pad) × (target_h + 2*pad) × 4, ready for texSubImage2D.
 * When force_opaque is true, all alpha values are set to 255 (most Source textures use alpha
 * for specular masks etc., not actual transparency).
 * @param {Uint8Array} vtf_data
 * @param {number} target_w
 * @param {number} target_h
 * @param {number} color_r
 * @param {number} color_g
 * @param {number} color_b
 * @param {boolean} force_opaque
 * @returns {Uint8Array | undefined}
 */
export function decode_and_tile_vtf(vtf_data, target_w, target_h, color_r, color_g, color_b, force_opaque) {
    const ptr0 = passArray8ToWasm0(vtf_data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.decode_and_tile_vtf(ptr0, len0, target_w, target_h, color_r, color_g, color_b, force_opaque);
    let v2;
    if (ret[0] !== 0) {
        v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    }
    return v2;
}

/**
 * @param {Uint8Array} data
 * @returns {Uint8Array}
 */
export function decompress_bz2(data) {
    const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.decompress_bz2(ptr0, len0);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

export function init() {
    wasm.init();
}

/**
 * @param {Uint8Array} data
 * @returns {BspMesh}
 */
export function parse_bsp(data) {
    const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.parse_bsp(ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return BspMesh.__wrap(ret[0]);
}

/**
 * Parse a BSP with extra files injected (e.g. prop models from VPK).
 * `extras_json` is a JSON array of `{"path":"models/foo.mdl","offset":0,"length":1234}`.
 * `extras_data` is all the file contents concatenated.
 * @param {Uint8Array} data
 * @param {string} extras_json
 * @param {Uint8Array} extras_data
 * @returns {BspMesh}
 */
export function parse_bsp_with_extras(data, extras_json, extras_data) {
    const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(extras_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(extras_data, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.parse_bsp_with_extras(ptr0, len0, ptr1, len1, ptr2, len2);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return BspMesh.__wrap(ret[0]);
}

/**
 * @param {Uint8Array} data
 * @returns {ReplayData}
 */
export function parse_replay(data) {
    const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.parse_replay(ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return ReplayData.__wrap(ret[0]);
}

/**
 * Parse a VMT file and return JSON: {"basetexture":"...", "color":[r,g,b], "fps":0, "is_water":false}
 * @param {Uint8Array} data
 * @returns {string | undefined}
 */
export function parse_vmt_data(data) {
    const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.parse_vmt_data(ptr0, len0);
    let v2;
    if (ret[0] !== 0) {
        v2 = getStringFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    }
    return v2;
}

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_Error_83742b46f01ce22d: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg___wbindgen_throw_6ddd609b62940d55: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_error_a6fa202b58aa1cd3: function(arg0, arg1) {
            let deferred0_0;
            let deferred0_1;
            try {
                deferred0_0 = arg0;
                deferred0_1 = arg1;
                console.error(getStringFromWasm0(arg0, arg1));
            } finally {
                wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
            }
        },
        __wbg_log_524eedafa26daa59: function(arg0) {
            console.log(arg0);
        },
        __wbg_log_89f0432d129e5e26: function(arg0, arg1) {
            console.log(getStringFromWasm0(arg0, arg1));
        },
        __wbg_new_227d7c05414eb861: function() {
            const ret = new Error();
            return ret;
        },
        __wbg_stack_3b0d974bbf31e44f: function(arg0, arg1) {
            const ret = arg1.stack;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbindgen_cast_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./bhop_replay_viewer_wasm_bg.js": import0,
    };
}

const BspMeshFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_bspmesh_free(ptr >>> 0, 1));
const ReplayDataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_replaydata_free(ptr >>> 0, 1));
const SkyboxResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_skyboxresult_free(ptr >>> 0, 1));

function getArrayF32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayI32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getInt32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

let cachedInt32ArrayMemory0 = null;
function getInt32ArrayMemory0() {
    if (cachedInt32ArrayMemory0 === null || cachedInt32ArrayMemory0.byteLength === 0) {
        cachedInt32ArrayMemory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArray32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getUint32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedFloat32ArrayMemory0 = null;
    cachedInt32ArrayMemory0 = null;
    cachedUint32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('bhop_replay_viewer_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
