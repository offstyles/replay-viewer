import type { Bz2WorkerResponse } from "./bz2Worker";

/**
 * Decompresses a bz2-packed BSP off the main thread. The input buffer is transferred
 * into the worker and the result is transferred back, so neither crosses as a copy —
 * which matters when the decompressed map runs to a gigabyte or more.
 */
export function decompressBz2(data: ArrayBuffer): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./bz2Worker.ts", import.meta.url), { type: "module" });

    worker.onmessage = (e: MessageEvent<Bz2WorkerResponse>) => {
      worker.terminate();
      if (e.data.ok) resolve(new Uint8Array(e.data.data));
      else reject(new Error(e.data.error));
    };

    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message || "bz2 worker failed"));
    };

    worker.postMessage(data, [data]);
  });
}
