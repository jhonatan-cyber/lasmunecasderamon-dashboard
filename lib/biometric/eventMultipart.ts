export class EventMultipartDecoder {
  private buffer: Buffer = Buffer.alloc(0);
  private readonly marker: Buffer;

  constructor(boundary: string) {
    if (!boundary || boundary.length > 200) throw new Error('Invalid event boundary');
    this.marker = Buffer.from(`--${boundary}`);
  }

  push(chunk: Uint8Array): string[] {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    if (this.buffer.length > 4_000_000) throw new Error('Event multipart exceeded buffer limit');
    const messages: string[] = [];
    while (true) {
      const start = this.buffer.indexOf(this.marker);
      if (start < 0) {
        this.buffer = this.buffer.subarray(Math.max(0, this.buffer.length - this.marker.length));
        break;
      }
      if (start) this.buffer = this.buffer.subarray(start);
      let headerEnd = this.buffer.indexOf('\r\n\r\n');
      let separatorLength = 4;
      if (headerEnd < 0) {
        headerEnd = this.buffer.indexOf('\n\n');
        separatorLength = 2;
      }
      if (headerEnd < 0) break;
      if (headerEnd > 8192) throw new Error('Event headers exceeded limit');
      const headers = this.buffer.subarray(0, headerEnd).toString('ascii');
      const bodyStart = headerEnd + separatorLength;
      const lengthHeader = /Content-Length:\s*(\d+)/i.exec(headers);
      let end: number;
      if (lengthHeader) {
        const length = Number(lengthHeader[1]);
        if (!Number.isSafeInteger(length) || length > 3_000_000)
          throw new Error('Invalid event length');
        end = bodyStart + length;
        if (this.buffer.length < end) break;
      } else {
        end = this.buffer.indexOf(this.marker, bodyStart);
        if (end < 0) break;
      }
      if (/Content-Type:\s*(text\/plain|application\/json)/i.test(headers)) {
        messages.push(this.buffer.subarray(bodyStart, end).toString('utf8').trim());
      }
      this.buffer = this.buffer.subarray(end);
    }
    return messages;
  }
}
