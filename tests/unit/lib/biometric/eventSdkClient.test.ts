// @vitest-environment node
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ spawn: vi.fn() }));
vi.mock('node:child_process', () => ({ spawn: mocks.spawn }));
import { abrirAvisosSdk } from '@/lib/biometric/eventSdkClient';

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');
  vi.stubEnv('BIOMETRIC_EVENTS_SDK', 'true');
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function setup() {
  const child = Object.assign(new EventEmitter(), {
    stdin: new PassThrough(),
    stdout: new PassThrough(),
    kill: vi.fn()
  });
  mocks.spawn.mockReturnValue(child);
  const abort = new AbortController();
  const onAviso = vi.fn();
  const onError = vi.fn();
  const ready = abrirAvisosSdk(
    { ip: '192.168.0.33', usuario: 'admin', clave: 'secret' },
    { signal: abort.signal, onAviso, onError }
  );
  return { child, abort, onAviso, onError, ready };
}
describe('SDK process client', () => {
  it('waits for ready, handles split messages and sends credentials only through stdin', async () => {
    const s = setup();
    s.child.stdout.write('{"type":"rea');
    s.child.stdout.write('dy"}\n');
    await s.ready;
    s.child.stdout.write('{"type":"event","code":516}\n');
    expect(s.onAviso).toHaveBeenCalledOnce();
    expect(JSON.stringify(mocks.spawn.mock.calls.at(-1))).not.toContain('secret');
    s.abort.abort();
    expect(s.onError).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2000);
    expect(s.child.kill).toHaveBeenCalledOnce();
  });
  it('rejects failed startup so the caller can fall back to CGI', async () => {
    const s = setup();
    const assertion = expect(s.ready).rejects.toThrow();
    s.child.stdout.write('{"type":"error"}\n');
    await assertion;
    s.child.emit('close');
    expect(s.onError).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('reports an established connection loss exactly once', async () => {
    const s = setup();
    s.child.stdout.write('{"type":"ready"}\n');
    await s.ready;
    s.child.stdout.write('{"type":"disconnected"}\n');
    s.child.emit('close');
    expect(s.onError).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
