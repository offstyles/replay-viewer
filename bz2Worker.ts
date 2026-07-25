/// <reference lib="webworker" />

import init, { decompress_bz2 } from "./wasm/bhop_replay_viewer_wasm";

export type Bz2WorkerResponse =
  | { ok: true; data: ArrayBuffer }
  | { ok: false; error: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (e: MessageEvent<ArrayBuffer>) => {
  try {
    await init();
    const out = decompress_bz2(new Uint8Array(e.data));
    const buffer = out.buffer as ArrayBuffer;
    ctx.postMessage({ ok: true, data: buffer } satisfies Bz2WorkerResponse, [buffer]);
  } catch (err) {
    ctx.postMessage({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    } satisfies Bz2WorkerResponse);
  }
};
