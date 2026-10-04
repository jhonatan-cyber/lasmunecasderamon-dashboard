// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  abrirFlujoEventos,
  EventManagerNoSoportadoError
} from '@/modules/asistencia/biometrico/eventStreamClient';
const credentials = { ip: '192.168.0.33', usuario: 'admin', clave: 'secret' };
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('CGI event transport', () => {
  it('falls back from snapManager and authenticates eventManager, delivering the final part immediately', async () => {
    vi.useFakeTimers();
    const payload =
      'Code=AccessControl;action=Pulse;data={"UserID":"1001","UTC":1790715000,"Method":15}';
    const bytes = Buffer.from(
      `--test\r\nContent-Type: text/plain\r\nContent-Length: ${Buffer.byteLength(payload)}\r\n\r\n${payload}`
    );
    const response = new Response(
      new ReadableStream({
        start(c) {
          c.enqueue(bytes);
          c.close();
        }
      }),
      { headers: { 'Content-Type': 'multipart/x-mixed-replace; boundary=test' } }
    );
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(
        new Response(null, {
          status: 401,
          headers: { 'WWW-Authenticate': 'Digest realm="test", nonce="nonce", qop="auth"' }
        })
      )
      .mockResolvedValueOnce(response);
    vi.stubGlobal('fetch', fetcher);
    const events = vi.fn();
    const errors = vi.fn();
    await abrirFlujoEventos(credentials, {
      signal: new AbortController().signal,
      onEvento: events,
      onError: errors
    });
    for (let i = 0; i < 25; i++) await Promise.resolve();
    expect(String(fetcher.mock.calls[0][0])).toContain('snapManager.cgi');
    expect(String(fetcher.mock.calls[1][0])).toContain('eventManager.cgi');
    expect(fetcher.mock.calls[2][1].headers.Authorization).toContain('Digest');
    expect(events).toHaveBeenCalledWith(expect.objectContaining({ userId: '1001', metodo: 15 }));
    expect(errors).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('reports unsupported only after trying both CGI endpoints', async () => {
    const fetcher = vi.fn().mockImplementation(async () => new Response(null, { status: 501 }));
    vi.stubGlobal('fetch', fetcher);
    await expect(
      abrirFlujoEventos(credentials, { signal: new AbortController().signal, onEvento: vi.fn() })
    ).rejects.toBeInstanceOf(EventManagerNoSoportadoError);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
