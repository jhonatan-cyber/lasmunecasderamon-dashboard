import { PassThrough } from 'node:stream';
import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), spawn: vi.fn() }));
vi.mock('@/lib/database/db', () => ({ query: mocks.query }));
vi.mock('@/modules/asistencia/biometrico/credencialesCrypto', () => ({
  descifrarSecreto: () => 'secret'
}));
vi.mock('node:child_process', () => ({ spawn: mocks.spawn, default: { spawn: mocks.spawn } }));
import { openVideoStream } from '@/modules/asistencia/biometrico/videoStream';

afterEach(() => vi.useRealTimers());
describe('video stream lifecycle', () => {
  function setup() {
    const child = Object.assign(new EventEmitter(), { stdout: new PassThrough(), kill: vi.fn() });
    mocks.query.mockResolvedValue([
      { ip: '192.168.0.33', usuario_equipo: 'admin', clave_cifrada: 'encrypted' }
    ]);
    mocks.spawn.mockReturnValue(child);
    return child;
  }
  it('stops FFmpeg on disconnect and does not expose RTSP credentials in headers', async () => {
    const child = setup();
    const controller = new AbortController();
    const response = await openVideoStream('reader', controller.signal);
    const reader = response.body!.getReader();
    child.stdout.write(Buffer.from('video'));
    expect(new TextDecoder().decode((await reader.read()).value)).toBe('video');
    controller.abort();
    expect(child.kill).toHaveBeenCalledOnce();
    expect((await reader.read()).done).toBe(true);
    expect(JSON.stringify([...response.headers])).not.toContain('secret');
  });
  it('kills stalled connections and releases the viewer slot', async () => {
    vi.useFakeTimers();
    const child = setup();
    await openVideoStream('reader', new AbortController().signal);
    await vi.advanceTimersByTimeAsync(15000);
    expect(child.kill).toHaveBeenCalledOnce();
  });
  it('cleans up on stream cancellation without closing an already closed controller', async () => {
    const child = setup();
    const response = await openVideoStream('reader', new AbortController().signal);
    await response.body!.cancel();
    expect(child.kill).toHaveBeenCalledOnce();
    expect(() => child.emit('close')).not.toThrow();
  });
});
