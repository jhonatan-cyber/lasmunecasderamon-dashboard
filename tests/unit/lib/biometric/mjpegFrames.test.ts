import { describe, expect, it } from 'vitest';
import { mjpegFrames } from '@/lib/utils/mjpegFrames';

describe('mjpegFrames', () => {
  it('handles every possible split across headers, payloads and consecutive frames', async () => {
    const bytes = new TextEncoder().encode(
      '--frame\r\nContent-length: 3\r\n\r\nabc\r\n--frame\r\nContent-length: 2\r\n\r\nde'
    );
    for (let split = 1; split < bytes.length; split++) {
      const body = new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(bytes.slice(0, split));
          c.enqueue(bytes.slice(split));
          c.close();
        }
      });
      const lengths = [];
      for await (const blob of mjpegFrames(body)) lengths.push(blob.size);
      expect(lengths).toEqual([3, 2]);
    }
  });
  it('rejects oversized frames instead of accumulating unbounded memory', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new TextEncoder().encode('--frame\r\nContent-length: 90000000\r\n\r\n'));
      }
    });
    await expect(mjpegFrames(body).next()).rejects.toThrow('Invalid video frame');
  });
});
