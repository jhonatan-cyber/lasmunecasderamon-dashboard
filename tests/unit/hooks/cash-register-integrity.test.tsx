import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCashRegister } from '@/hooks/caja/useCashRegister';
import { toast } from 'sonner';
vi.unmock('@tanstack/react-query');
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const clients: QueryClient[] = [];
function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  clients.push(client);
  return function Provider({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  for (const client of clients.splice(0)) client.clear();
});
const response = (data: unknown = [], ok = true) => ({
  ok,
  status: ok ? 200 : 500,
  json: async () => ({ success: true, data })
});
const closeData = {
  id_caja: 1,
  usuario_id_cierre: 1,
  fecha_cierre: '2026-10-10',
  monto_cierre: 100
};
const withdrawal = { caja_id: 1, monto: 10, motivo: 'Gasto', usuario_id: 1 };
function defaults(url: string) {
  return response(url.endsWith('/status') ? { hasOpenCaja: true, cajaInfo: { id_caja: 1 } } : []);
}

describe('integridad de caja', () => {
  it('consulta el filtro solicitado sin volver al listado anterior', async () => {
    const request = vi.fn(async (url: string) =>
      url.includes('estado=0') ? response([{ id_caja: 2, estado: 0 }]) : defaults(url)
    );
    vi.stubGlobal('fetch', request);
    const { result } = renderHook(useCashRegister, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const initialReads = request.mock.calls.filter(([url]) => url === '/api/cashregister').length;
    await act(async () => {
      await result.current.getCajas(0);
    });
    await waitFor(() => expect(result.current.cajas[0]?.id_caja).toBe(2));
    expect(request.mock.calls.filter(([url]) => url === '/api/cashregister')).toHaveLength(
      initialReads
    );
    expect(request.mock.calls.filter(([url]) => url.includes('estado=0'))).toHaveLength(1);
  });
  it.each(['crear', 'editar', 'retirar', 'eliminar', 'cerrar'])(
    '%s no informa éxito si HTTP falla',
    async operation => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string, options?: RequestInit) =>
          options?.method && options.method !== 'GET'
            ? response({ estado: 'cerrada' }, false)
            : defaults(url)
        )
      );
      const { result } = renderHook(useCashRegister, { wrapper: wrapper() });
      await waitFor(() => expect(result.current.loading).toBe(false));
      let outcome: unknown;
      await act(async () => {
        if (operation === 'crear')
          outcome = await result.current.createCaja({
            monto_apertura: 100,
            usuario_id_apertura: 1
          });
        if (operation === 'editar') outcome = await result.current.updateCaja(1, { estado: 0 });
        if (operation === 'retirar') outcome = await result.current.retirarDinero(withdrawal);
        if (operation === 'eliminar') outcome = await result.current.deleteCaja(1);
        if (operation === 'cerrar') outcome = await result.current.cerrarCaja(closeData);
      });
      expect(outcome).toBe(operation === 'retirar' || operation === 'eliminar' ? false : null);
      expect(toast.success).not.toHaveBeenCalled();
    }
  );
  it('mantiene un cierre 202 como pendiente aunque el aviso no haya salido', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.endsWith('/cierre')
          ? {
              ok: true,
              status: 202,
              json: async () => ({
                success: false,
                message: 'Aviso pendiente',
                data: { estado: 'pendiente' }
              })
            }
          : defaults(url)
      )
    );
    const { result } = renderHook(useCashRegister, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.cerrarCaja(closeData);
    });
    expect(outcome).toMatchObject({ estado: 'pendiente' });
    expect(toast.error).not.toHaveBeenCalled();
  });
  it('no considera cerrada una respuesta sin el estado de cierre', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => (url.endsWith('/cierre') ? response({}) : defaults(url)))
    );
    const { result } = renderHook(useCashRegister, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      expect(await result.current.cerrarCaja(closeData)).toBeNull();
    });
    expect(toast.success).not.toHaveBeenCalled();
  });
  it('bloquea retiros simultáneos y libera el bloqueo después de un fallo', async () => {
    let finish!: (value: ReturnType<typeof response>) => void;
    const request = vi.fn(async (url: string) =>
      url.endsWith('/retiros')
        ? new Promise<ReturnType<typeof response>>(resolve => {
            finish = resolve;
          })
        : defaults(url)
    );
    vi.stubGlobal('fetch', request);
    const { result } = renderHook(useCashRegister, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    let pending!: Promise<boolean>;
    act(() => {
      pending = result.current.retirarDinero(withdrawal);
    });
    await act(async () => {
      expect(await result.current.retirarDinero(withdrawal)).toBe(false);
    });
    expect(request.mock.calls.filter(([url]) => url.endsWith('/retiros'))).toHaveLength(1);
    await act(async () => {
      finish(response({}, false));
      await pending;
    });
    request.mockImplementation(async url => defaults(url));
    await act(async () => {
      expect(await result.current.retirarDinero(withdrawal)).toBe(true);
    });
    expect(request.mock.calls.filter(([url]) => url.endsWith('/retiros'))).toHaveLength(2);
  });
  it('mantiene la carga mientras otra consulta continúa pendiente', async () => {
    let finish!: (value: ReturnType<typeof response>) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.includes('resumen=1')
          ? new Promise<ReturnType<typeof response>>(resolve => {
              finish = resolve;
            })
          : defaults(url)
      )
    );
    const { result } = renderHook(useCashRegister, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.hasOpenCaja).toBe(true));
    expect(result.current.loading).toBe(true);
    await act(async () => {
      finish(response({ total_ventas: 10 }));
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
  it('un fallo al consultar el estado deja la disponibilidad desconocida', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.endsWith('/status') ? response({ hasOpenCaja: true }, false) : defaults(url)
      )
    );
    const { result } = renderHook(useCashRegister, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasOpenCaja).toBeNull();
    expect(result.current.error).toBeTruthy();
  });
  it('el detalle tardío no reemplaza la caja seleccionada', async () => {
    let finish!: (value: ReturnType<typeof response>) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.endsWith('?id=1')
          ? new Promise<ReturnType<typeof response>>(resolve => {
              finish = resolve;
            })
          : url.endsWith('?id=2')
            ? response({ id_caja: 2 })
            : defaults(url)
      )
    );
    const { result } = renderHook(useCashRegister, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    let previous!: Promise<void>;
    act(() => {
      previous = result.current.getCajaById(1);
    });
    await act(async () => {
      await result.current.getCajaById(2);
    });
    await act(async () => {
      finish(response({ id_caja: 1 }));
      await previous;
    });
    expect(result.current.cajaActual?.id_caja).toBe(2);
  });
});
