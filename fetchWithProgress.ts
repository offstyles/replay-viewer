export async function fetchWithProgress(
  url: string,
  onProgress: (received: number, total: number | null) => void,
  credentials: RequestCredentials = 'same-origin',
): Promise<ArrayBuffer> {
  const response = await fetch(url, { credentials });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  // If no body stream available, fall back to simple arrayBuffer
  if (!response.body) {
    onProgress(0, null);
    return response.arrayBuffer();
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : null;

  // Always use streaming reader so progress updates even without Content-Length
  const reader = response.body.getReader();
  let received = 0;

  onProgress(0, total);

  // Fast path when the size is known up front: write directly into one buffer.
  // For huge files (e.g. ~1GB map downloads) this halves peak memory vs.
  // accumulating chunks and copying into a final buffer at the end.
  if (total !== null) {
    const result = new Uint8Array(total);
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      // Guard against servers that under-report Content-Length: fall back to
      // the chunked path rather than overflowing the preallocated buffer.
      if (received + value.length > total) {
        const chunks: Uint8Array[] = [result.subarray(0, received), value];
        received += value.length;
        onProgress(received, null);
        while (true) {
          const r = await reader.read();
          if (r.done) break;
          chunks.push(r.value);
          received += r.value.length;
          onProgress(received, null);
        }
        const overflow = new Uint8Array(received);
        let off = 0;
        for (const c of chunks) {
          overflow.set(c, off);
          off += c.length;
        }
        return overflow.buffer;
      }
      result.set(value, received);
      received += value.length;
      onProgress(received, total);
    }
    // Server may also over-report; trim to actual bytes read.
    if (received !== total) return result.buffer.slice(0, received);
    return result.buffer;
  }

  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress(received, total);
  }

  const result = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result.buffer;
}
