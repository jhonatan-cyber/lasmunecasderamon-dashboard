import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useSales } from '@/hooks/cash-register/useSales';
import { useGenericFetch } from '@/hooks/shared/useGenericFetch';

vi.mock('@/lib/utils/toastUtils', () => ({ showErrorToast: vi.fn() }));
vi.unmock('@tanstack/react-query');

const clients: QueryClient[] = [];
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  for (const client of clients.splice(0)) client.clear();
});

describe('carga de ventas con filtros', () => {
  it('consulta directamente los filtros nuevos y permite limpiarlos', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });
    vi.stubGlobal('fetch', request);
    const { result } = renderHook(useSales, { wrapper: wrapper() });
    expect(request).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.getVentas({ metodo_pago: 'efectivo' });
    });
    await act(async () => {
      await result.current.getVentas({ metodo_pago: 'tarjeta' });
    });
    await act(async () => {
      await result.current.getVentas();
    });
    expect(request.mock.calls.map(call => call[0])).toEqual([
      '/api/sales?limit=1000&metodo_pago=efectivo',
      '/api/sales?limit=1000&metodo_pago=tarjeta',
      '/api/sales?limit=1000'
    ]);
  });

  it('expone el error de lectura de ventas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, statusText: 'Service Unavailable' })
    );
    const { result } = renderHook(useSales, { wrapper: wrapper() });
    await act(async () => {
      await result.current.getVentas({ estado: 'activa' });
    });
    expect(result.current.error).toContain('Service Unavailable');
  });

  it('las consultas compartidas cancelan la red al desmontar su último lector', () => {
    const request = vi.fn().mockImplementation(() => new Promise(() => {}));
    vi.stubGlobal('fetch', request);
    const { unmount } = renderHook(() => useGenericFetch('/api/test'), { wrapper: wrapper() });
    const signal = request.mock.calls[0][1].signal;
    expect(signal.aborted).toBe(false);
    unmount();
    expect(signal.aborted).toBe(true);
  });

  it('no muestra CancelledError al cancelar una consulta y permite volver a cargar', async () => {
    const request = vi
      .fn()
      .mockImplementationOnce(() => new Promise(() => {}))
      .mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ id: 'v1', estado: 'activa' }] })
      });
    vi.stubGlobal('fetch', request);
    const { result } = renderHook(useSales, { wrapper: wrapper() });
    let pending: Promise<void>;
    act(() => {
      pending = result.current.getVentas();
    });
    await act(async () => {
      await clients[clients.length - 1].cancelQueries({ queryKey: ['/api/sales?limit=1000'] });
      await pending!;
    });
    expect(result.current.error).toBeNull();
    await act(async () => {
      await result.current.getVentas();
    });
    expect(result.current.error).toBeNull();
    expect(request).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(result.current.ventas).toEqual([{ id: 'v1', estado: 'activa' }]);
    });
  });

  it('un fallo de filtros anteriores no reemplaza el resultado del filtro nuevo', async () => {
    let rejectPrevious: (error: Error) => void;
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise((_resolve, reject) => {
              rejectPrevious = reject;
            })
        )
        .mockResolvedValue({
          ok: true,
          json: async () => ({ data: [{ id: 'v2', estado: 'activa' }] })
        })
    );
    const { result } = renderHook(useSales, { wrapper: wrapper() });
    let pending: Promise<void>;
    act(() => {
      pending = result.current.getVentas({ metodo_pago: 'efectivo' });
    });
    await act(async () => {
      await result.current.getVentas({ metodo_pago: 'tarjeta' });
    });
    await act(async () => {
      rejectPrevious!(new Error('Solicitud anterior fallida'));
      await pending!;
    });
    expect(result.current.error).toBeNull();
    expect(result.current.ventas).toEqual([{ id: 'v2', estado: 'activa' }]);
  });
});
