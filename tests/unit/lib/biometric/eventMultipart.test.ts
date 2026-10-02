// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { EventMultipartDecoder } from '@/lib/biometric/eventMultipart';
import { extraerEventosDeChunk } from '@/lib/biometric/eventStreamClient';

const payload =
  'Events[0].Code=AccessControl\r\nEvents[0].Data.UserID=1001\r\nEvents[0].Data.UTC=1790715000\r\nEvents[0].Data.Method=15\r\nEvents[0].Data.Status=0';
function part(type: string, content: Buffer) {
  return Buffer.concat([
    Buffer.from(`--boundary\r\nContent-Type: ${type}\r\nContent-Length: ${content.length}\r\n\r\n`),
    content,
    Buffer.from('\r\n')
  ]);
}
describe('event multipart', () => {
  it('preserves text and ignores JPEG bytes at every possible chunk split', () => {
    const bytes = Buffer.concat([
      part('image/jpeg', Buffer.from([255, 216, 0, 255, 217])),
      part('text/plain', Buffer.from(payload)),
      part('text/plain', Buffer.from('Heartbeat'))
    ]);
    for (let split = 1; split < bytes.length; split++) {
      const parser = new EventMultipartDecoder('boundary');
      const text = [
        ...parser.push(bytes.subarray(0, split)),
        ...parser.push(bytes.subarray(split))
      ];
      expect(text).toEqual([payload, 'Heartbeat']);
      expect(extraerEventosDeChunk(text[0])).toEqual([
        expect.objectContaining({ userId: '1001', createTime: 1790715000, metodo: 15, status: 0 })
      ]);
    }
  });
  it('parses single-line eventManager JSON and multiple nested snapManager events', () => {
    expect(
      extraerEventosDeChunk(
        'Code=AccessControl;action=Pulse;index=0;data={"UserID":"1001","UTC":1790715000,"Method":15}'
      )
    ).toHaveLength(1);
    expect(
      extraerEventosDeChunk(
        payload + '\r\n' + payload.replaceAll('Events[0]', 'Events[1]').replace('1001', '1002')
      )
    ).toHaveLength(2);
  });
  it('ignores heartbeats, invalid JSON and events without device timestamps', () => {
    for (const text of [
      'Heartbeat',
      'Code=AccessControl;data={',
      'Code=AccessControl;data={"UserID":"1001"}'
    ])
      expect(extraerEventosDeChunk(text)).toEqual([]);
  });
  it('rejects oversized declared payloads', () => {
    const parser = new EventMultipartDecoder('boundary');
    expect(() =>
      parser.push(Buffer.from('--boundary\r\nContent-Length: 9000000\r\n\r\n'))
    ).toThrow();
  });
});
