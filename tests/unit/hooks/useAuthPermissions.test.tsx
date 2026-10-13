import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthPermissions } from '@/contexts/auth/useAuthPermissions';
import logger from '@/lib/utils/logger';

vi.mock('@/lib/utils/logger', () => ({ default: { warn: vi.fn(), captureException: vi.fn() } }));
const user = { id: 1, name: 'Prueba', lastName: '', role: 'Barman', status: 1 };
const getUser = () => user;
const permission = { id: 1, name: 'Bar', description: '', module: 'products', action: 'view' };
const pending = (_url: unknown, init: RequestInit) =>
  new Promise<Response>((_resolve, reject) => {
    init.signal?.addEventListener('abort', () =>
      reject(new DOMException('signal is aborted without reason', 'AbortError'))
    );
  });
const mount = () => renderHook(() => useAuthPermissions({ getUser, onSessionExpired: vi.fn() }));
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('consulta de permisos', () => {
  it('controla el timeout sin reportarlo como excepción ni dejar el indicador cargando', async () => {
    vi.stubGlobal('fetch', vi.fn(pending));
    const { result } = mount();
    expect(result.current.permissionsLoading).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });
    expect(result.current.permissionsLoading).toBe(false);
    expect(result.current.permissionsLoaded).toBe(true);
    expect(logger.captureException).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
    expect(result.current.hasPermission('products', 'view')).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('conserva los permisos anteriores cuando una actualización agota el tiempo', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [permission] })
        })
        .mockImplementationOnce(pending)
    );
    const { result } = mount();
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.hasPermission('products', 'view')).toBe(true);
    let refresh: Promise<void>;
    act(() => {
      refresh = result.current.refreshPermissions(true);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
      await refresh!;
    });
    expect(result.current.hasPermission('products', 'view')).toBe(true);
    expect(logger.captureException).not.toHaveBeenCalled();
  });

  it('limpia el temporizador cuando falla la red y mantiene el registro del error real', async () => {
    const failure = new TypeError('Failed to fetch');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(failure));
    const { result } = mount();
    await act(async () => {
      await Promise.resolve();
    });
    expect(vi.getTimerCount()).toBe(0);
    expect(result.current.permissionsLoading).toBe(false);
    expect(logger.captureException).toHaveBeenCalledWith(failure, {
      context: 'AuthContext:fetchPermissions'
    });
  });

  it('limita también el tiempo de lectura del cuerpo de la respuesta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url, init: RequestInit) =>
        Promise.resolve({ ok: true, json: () => pending('', init) })
      )
    );
    const { result } = mount();
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });
    expect(result.current.permissionsLoading).toBe(false);
    expect(logger.captureException).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
