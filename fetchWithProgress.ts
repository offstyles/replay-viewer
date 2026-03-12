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
  const chunks: Uint8Array[] = [];
  let received = 0;

  onProgress(0, total);

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
