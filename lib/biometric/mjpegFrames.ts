export async function* mjpegFrames(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  let buffer = new Uint8Array(0);
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) return;
      const combined = new Uint8Array(buffer.length + value.length);
      combined.set(buffer);
      combined.set(value, buffer.length);
      buffer = combined;
      while (buffer.length) {
        let end = -1;
        for (let i = 0; i < buffer.length - 3; i++) {
          if (
            buffer[i] === 13 &&
            buffer[i + 1] === 10 &&
            buffer[i + 2] === 13 &&
            buffer[i + 3] === 10
          ) {
            end = i + 4;
            break;
          }
        }
        if (end === -1) {
          if (buffer.length > 4096) throw new Error('Invalid video header');
          break;
        }
        const header = decoder.decode(buffer.subarray(0, end));
        const length = Number(/Content-length:\s*(\d+)/i.exec(header)?.[1]);
        if (!Number.isSafeInteger(length) || length <= 0 || length > 2_000_000) {
          throw new Error('Invalid video frame');
        }
        if (buffer.length < end + length) break;
        yield new Blob([buffer.slice(end, end + length)], { type: 'image/jpeg' });
        buffer = buffer.slice(end + length);
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
