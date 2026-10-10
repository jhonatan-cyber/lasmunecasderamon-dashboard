import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useOrderDetail } from '@/hooks/orders/useOrderDetail';
import useOrders from '@/hooks/servicios/useOrders';
import { useServicios } from '@/hooks/servicios/useServicios';
import { useOrdersList } from '@/hooks/orders/useOrdersList';
import { showSuccessToast } from '@/lib/utils/toastUtils';

vi.unmock('@tanstack/react-query');
vi.mock('@/hooks/shared', () => ({ useSharedSSE: vi.fn() }));
vi.mock('@/hooks/orders/useOrdersSSE', () => ({ useOrdersSSE: vi.fn() }));
vi.mock('@/lib/utils/toastUtils', () => ({ showSuccessToast: vi.fn(), showErrorToast: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const clients: QueryClient[] = [];
function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  clients.push(client);
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  for (const client of clients.splice(0)) client.clear();
});

describe('pedidos y servicios', () => {
  it('una respuesta tardía no reemplaza el detalle del pedido actual', async () => {
    let finish!: (value: object) => void;
    const request = vi.fn().mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    request.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [{ id: 'nuevo' }] })
    });
    vi.stubGlobal('fetch', request);
    const { result, rerender } = renderHook(({ id }: { id: string | null }) => useOrderDetail(id), {
      initialProps: { id: 'anterior' } as { id: string | null }
    });
    rerender({ id: 'nuevo' });
    await waitFor(() => expect(result.current.detail).toEqual([{ id: 'nuevo' }]));
    expect(request.mock.calls[0][1].signal.aborted).toBe(true);
    await act(async () => {
      finish({ ok: true, json: async () => ({ success: true, data: [{ id: 'anterior' }] }) });
    });
    expect(result.current.detail).toEqual([{ id: 'nuevo' }]);
    rerender({ id: null });
    expect(result.current.detail).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it.each(['crear', 'editar', 'eliminar'])(
    'pedidos no muestran éxito al %s con HTTP fallido',
    async action => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async (_url: string, options?: RequestInit) => ({
          ok: options?.method === 'GET',
          json: async () => ({ success: true, data: [], message: 'Solicitud rechazada' })
        }))
      );
      const { result } = renderHook(useOrders, { wrapper: wrapper() });
      await act(async () => {
        if (action === 'crear') await result.current.createOrder({});
        if (action === 'editar') await result.current.updateOrder({ id: 1 } as any);
        if (action === 'eliminar') await result.current.deleteOrder(1);
      });
      expect(showSuccessToast).not.toHaveBeenCalled();
      expect(result.current.error).toBe('Solicitud rechazada');
    }
  );

  it.each(['crear', 'editar', 'eliminar', 'estado'])(
    'servicios rechazan HTTP fallido al %s',
    async action => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async (_url: string, options?: RequestInit) => ({
          ok: options?.method === 'GET',
          json: async () => ({ success: true, data: [], message: 'Solicitud rechazada' })
        }))
      );
      const { result } = renderHook(useServicios, { wrapper: wrapper() });
      await act(async () => {
        const call =
          action === 'crear'
            ? result.current.createServicio({})
            : action === 'editar'
              ? result.current.updateServicio('1', {})
              : action === 'eliminar'
                ? result.current.deleteServicio('1')
                : result.current.patchServicio('1', {});
        await expect(call).rejects.toThrow('Solicitud rechazada');
      });
    }
  );

  it.each(['pedido', 'solicitud'])(
    'no quita una %s de la lista si la eliminación fue rechazada',
    async type => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string, options?: RequestInit) => ({
          ok: options?.method !== 'DELETE',
          json: async () => ({
            success: true,
            data: url.includes('solicitudes')
              ? [{ id_solicitud: '1', estado: 'pendiente' }]
              : [{ id_pedido: '1' }]
          })
        }))
      );
      const { result } = renderHook(useOrdersList);
      await waitFor(() => expect(result.current.orders).toHaveLength(1));
      await waitFor(() => expect(result.current.servicios).toHaveLength(1));
      await act(async () => {
        const success =
          type === 'pedido'
            ? await result.current.deleteOrder('1')
            : await result.current.deleteServicio('1');
        expect(success).toBe(false);
      });
      expect(result.current.orders).toHaveLength(1);
      expect(result.current.servicios).toHaveLength(1);
    }
  );
});
