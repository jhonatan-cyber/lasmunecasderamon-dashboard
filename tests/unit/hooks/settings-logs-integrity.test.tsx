import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useSettingsLogs } from '@/hooks/settings/useSettingsLogs';
vi.mock('@/lib/utils/logger', () => ({ default: { captureException: vi.fn() } }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const response = (id: string, ok = true) => ({
  ok,
  json: async () => ({ success: ok, data: [{ id }] })
});
describe('registros de configuración', () => {
  it('conserva auditoría si falla su actualización y actualiza los errores disponibles', async () => {
    let refreshed = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        refreshed
          ? url.includes('audit')
            ? response('fallido', false)
            : response('error-nuevo')
          : response('anterior')
      )
    );
    const { result } = renderHook(useSettingsLogs);
    await waitFor(() => expect(result.current.loading).toBe(false));
    refreshed = true;
    await act(async () => {
      await result.current.fetchLogs(false);
    });
    expect(result.current.auditLogs[0].id).toBe('anterior');
    expect(result.current.errorLogs[0].id).toBe('error-nuevo');
    expect(result.current.error).toBeTruthy();
    expect(result.current.refreshing).toBe(false);
  });
  it('ignora respuestas anteriores después de una nueva actualización', async () => {
    const finish: ((value: ReturnType<typeof response>) => void)[] = [];
    let deferred = true;
    const request = vi.fn((_url: string, _options?: RequestInit) =>
      deferred
        ? new Promise<ReturnType<typeof response>>(resolve => finish.push(resolve))
        : Promise.resolve(response('nuevo'))
    );
    vi.stubGlobal('fetch', request);
    const { result } = renderHook(useSettingsLogs);
    deferred = false;
    await act(async () => {
      await result.current.fetchLogs(false);
    });
    await act(async () => {
      finish.forEach(resolve => resolve(response('anterior')));
    });
    expect(result.current.auditLogs[0].id).toBe('nuevo');
    expect(result.current.errorLogs[0].id).toBe('nuevo');
    expect(request.mock.calls[0][1]!.signal!.aborted).toBe(true);
  });
  it('un fallo de una consulta inicial no borra la otra lista', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('error')) throw new Error('Sin conexión');
        return response('auditoría');
      })
    );
    const { result } = renderHook(useSettingsLogs);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.auditLogs[0].id).toBe('auditoría');
    expect(result.current.errorLogs).toEqual([]);
    expect(result.current.error).toBeTruthy();
  });
});
