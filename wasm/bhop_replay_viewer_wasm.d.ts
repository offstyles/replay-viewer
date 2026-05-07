/* tslint:disable */
/* eslint-disable */

export class ReplayData {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    angles(): Float32Array;
    buttons_array(): Int32Array;
    flags_array(): Int32Array;
    positions(): Float32Array;
    tick_count(): number;
    tick_rate(): number;
    time(): number;
}

export function decompress_bz2(data: Uint8Array): Uint8Array;

export function init(): void;

export function parse_replay(data: Uint8Array): ReplayData;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly decompress_bz2: (a: number, b: number) => [number, number, number, number];
    readonly init: () => void;
    readonly __wbg_replaydata_free: (a: number, b: number) => void;
    readonly parse_replay: (a: number, b: number) => [number, number, number];
    readonly replaydata_angles: (a: number) => [number, number];
    readonly replaydata_buttons_array: (a: number) => [number, number];
    readonly replaydata_flags_array: (a: number) => [number, number];
    readonly replaydata_positions: (a: number) => [number, number];
    readonly replaydata_tick_count: (a: number) => number;
    readonly replaydata_tick_rate: (a: number) => number;
    readonly replaydata_time: (a: number) => number;
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
