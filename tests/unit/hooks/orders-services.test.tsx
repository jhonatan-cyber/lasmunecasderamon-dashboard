import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useOrderDetail } from '@/hooks/orders/useOrderDetail';
import useOrders from '@/hooks/orders/useOrders';
import { useServicios } from '@/hooks/services/useServicios';
import { useOrdersList } from '@/hooks/orders/useOrdersList';
import { showSuccessToast } from '@/lib/utils/toastUtils';
import { appEventBus } from '@/lib/utils/eventBus';

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

  it.each(['success', 'failure', 'rejection'])(
    'useOrders conserva B ante una respuesta tardía de A (%s)',
    async outcome => {
      type DetailResponse = { ok: boolean; json: () => Promise<object> };
      let finishA!: (value: DetailResponse) => void;
      let rejectA!: (error: Error) => void;
      let finishB!: (value: DetailResponse) => void;
      const responseA = new Promise<DetailResponse>((resolve, reject) => {
        finishA = resolve;
        rejectA = reject;
      });
      const responseB = new Promise<DetailResponse>(resolve => {
        finishB = resolve;
      });
      const request = vi.fn((url: string, _options?: RequestInit) => {
        if (url.includes('detail?id=A')) return responseA;
        if (url.includes('detail?id=B')) return responseB;
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
      });
      vi.stubGlobal('fetch', request);
      const { result } = renderHook(useOrders, { wrapper: wrapper() });
      let loadA!: Promise<void>;
      let loadB!: Promise<void>;
      act(() => {
        loadA = result.current.fetchOrderDetail('A');
      });
      const signalA = request.mock.calls.find(([url]) => url.includes('detail?id=A'))?.[1]?.signal;
      act(() => {
        loadB = result.current.fetchOrderDetail('B');
      });
      expect(signalA?.aborted).toBe(true);
      await act(async () => {
        finishB({ ok: true, json: async () => ({ success: true, data: [{ id: 'B' }] }) });
        await loadB;
      });
      await act(async () => {
        if (outcome === 'rejection') rejectA(new Error('A falló'));
        else
          finishA({
            ok: outcome === 'success',
            json: async () => ({
              success: outcome === 'success',
              data: [{ id: 'A' }],
              message: 'Error A'
            })
          });
        await loadA;
      });
      expect(result.current.orderDetail).toEqual([{ id: 'B' }]);
      expect(result.current.detailError).toBeNull();
      expect(result.current.isDetailLoading).toBe(false);
    }
  );

  it('useOrders limpia el detalle anterior y A no apaga loading de B', async () => {
    let finishA!: (value: object) => void;
    let finishB!: (value: object) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('detail?id=A'))
          return new Promise(resolve => {
            finishA = resolve;
          });
        if (url.includes('detail?id=B'))
          return new Promise(resolve => {
            finishB = resolve;
          });
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: url.includes('detail') ? [{ id: 'anterior' }] : []
          })
        });
      })
    );
    const { result } = renderHook(useOrders, { wrapper: wrapper() });
    await act(async () => {
      await result.current.fetchOrderDetail('anterior');
    });
    expect(result.current.orderDetail).toEqual([{ id: 'anterior' }]);
    let loadA!: Promise<void>;
    let loadB!: Promise<void>;
    act(() => {
      loadA = result.current.fetchOrderDetail('A');
      loadB = result.current.fetchOrderDetail('B');
    });
    expect(result.current.orderDetail).toEqual([]);
    await act(async () => {
      finishA({ ok: false, json: async () => ({ success: false, message: 'Error A' }) });
      await loadA;
    });
    expect(result.current.isDetailLoading).toBe(true);
    expect(result.current.detailError).toBeNull();
    await act(async () => {
      finishB({ ok: false, json: async () => ({ success: false, message: 'Error B' }) });
      await loadB;
    });
    expect(result.current.detailError).toBe('Error B');
    expect(result.current.isDetailLoading).toBe(false);
  });

  it('useOrders conserva el error vigente de B frente al éxito tardío de A', async () => {
    let finishA!: (value: object) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('detail?id=A'))
          return new Promise(resolve => {
            finishA = resolve;
          });
        return Promise.resolve({
          ok: !url.includes('detail'),
          json: async () => ({ success: !url.includes('detail'), data: [], message: 'Error B' })
        });
      })
    );
    const { result } = renderHook(useOrders, { wrapper: wrapper() });
    let loadA!: Promise<void>;
    act(() => {
      loadA = result.current.fetchOrderDetail('A');
    });
    await act(async () => {
      await result.current.fetchOrderDetail('B');
    });
    await act(async () => {
      finishA({ ok: true, json: async () => ({ success: true, data: [{ id: 'A' }] }) });
      await loadA;
    });
    expect(result.current.orderDetail).toEqual([]);
    expect(result.current.detailError).toBe('Error B');
    expect(result.current.isDetailLoading).toBe(false);
  });

  it('useOrders aborta el detalle al desmontar', async () => {
    let finish!: (value: object) => void;
    const request = vi.fn((url: string, _options?: RequestInit) =>
      url.includes('detail')
        ? new Promise(resolve => {
            finish = resolve;
          })
        : Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) })
    );
    vi.stubGlobal('fetch', request);
    const { result, unmount } = renderHook(useOrders, { wrapper: wrapper() });
    let loading!: Promise<void>;
    act(() => {
      loading = result.current.fetchOrderDetail('A');
    });
    const signal = request.mock.calls.find(([url]) => url.includes('detail'))?.[1]?.signal;
    unmount();
    expect(signal?.aborted).toBe(true);
    await act(async () => {
      finish({ ok: false, json: async () => ({ success: false, message: 'Error tardío' }) });
      await loading;
    });
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
            data: url.includes('service-requests')
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

  it('quita el pedido del listado cuando la venta se registra en este dashboard', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => ({
        ok: true,
        json: async () => ({
          success: true,
          data: url.includes('service-requests') ? [] : [{ id_pedido: '1' }, { id_pedido: '2' }]
        })
      }))
    );
    const { result } = renderHook(useOrdersList);
    await waitFor(() => expect(result.current.orders).toHaveLength(2));

    act(() => {
      appEventBus.emit('updatePendingOrders', { type: 'order-processed', orderId: '1' });
    });

    await waitFor(() => expect(result.current.orders.map(order => order.id_pedido)).toEqual(['2']));
  });

  it('recarga el listado cuando el evento avisa un cambio sin detalle', async () => {
    const request = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => ({
        success: true,
        data: url.includes('service-requests') ? [] : [{ id_pedido: '1' }]
      })
    }));
    vi.stubGlobal('fetch', request);
    const { result } = renderHook(useOrdersList);
    await waitFor(() => expect(result.current.orders).toHaveLength(1));
    const llamadas = request.mock.calls.length;

    await act(async () => {
      appEventBus.emit('updatePendingOrders', {});
    });

    await waitFor(() => expect(request.mock.calls.length).toBe(llamadas + 2));
  });
});
