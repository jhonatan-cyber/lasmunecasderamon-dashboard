import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import useProducts from '@/hooks/products/useProducts';
import useRooms from '@/hooks/rooms/useRooms';

vi.unmock('@tanstack/react-query');
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/utils/toastUtils', () => ({ showSuccessToast: vi.fn(), showErrorToast: vi.fn() }));
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

describe('actualización de estados', () => {
  it('conserva el orden nuevo de habitaciones y actualiza sus posiciones', async () => {
    let reordered = false;
    const request = vi.fn(async (_url: string, options?: RequestInit) => {
      if (options?.method === 'PUT') reordered = true;
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: reordered
            ? [
                { id: 'b', name: 'Segunda', display_order: 1 },
                { id: 'a', name: 'Primera', display_order: 2 }
              ]
            : [
                { id: 'a', name: 'Primera', display_order: 1 },
                { id: 'b', name: 'Segunda', display_order: 2 }
              ]
        })
      };
    });
    vi.stubGlobal('fetch', request);
    const { result } = renderHook(useRooms, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.rooms).toHaveLength(2));
    await act(async () => {
      await result.current.reorderRooms([...result.current.rooms].reverse());
    });
    await waitFor(() => expect(result.current.rooms.map(room => room.id)).toEqual(['b', 'a']));
    expect(result.current.rooms.map(room => room.display_order)).toEqual([1, 2]);
    expect(
      [...result.current.rooms]
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .map(room => room.id)
    ).toEqual(['b', 'a']);
  });
  it('eliminar una presentación usa su ID y conserva el producto y la otra presentación', async () => {
    let deleted = false;
    const request = vi.fn(async (url: string, options?: RequestInit) => {
      if (options?.method === 'DELETE') deleted = true;
      return {
        ok: true,
        json: async () => ({ success: true, data: [{ id: 'producto', name: 'Ron' }] })
      };
    });
    vi.stubGlobal('fetch', request);
    const { result } = renderHook(
      () => ({
        products: useProducts('categoria'),
        presentations: useQuery({
          queryKey: ['product-presentations', 'producto'],
          queryFn: async () => (deleted ? ['grande'] : ['pequeña', 'grande']),
          staleTime: Infinity
        })
      }),
      { wrapper: wrapper() }
    );
    await waitFor(() => expect(result.current.presentations.data).toEqual(['pequeña', 'grande']));
    await act(async () => {
      await result.current.products.deletePresentation('pequeña');
    });
    await waitFor(() => expect(result.current.presentations.data).toEqual(['grande']));
    expect(result.current.products.allProducts[0].id).toBe('producto');
    const removals = request.mock.calls.filter(([, options]) => options?.method === 'DELETE');
    expect(removals).toHaveLength(1);
    expect(removals[0][0]).toBe('/api/products/presentations?id=peque%C3%B1a');
  });
  it('mantiene el nuevo orden de productos en la lista ordenada', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            { id: '1', name: 'Primero', display_order: 1 },
            { id: '2', name: 'Segundo', display_order: 2 }
          ]
        })
      }))
    );
    const { result } = renderHook(() => useProducts('categoria'), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.products).toHaveLength(2));
    await act(async () => {
      await result.current.reorderProducts([...result.current.allProducts].reverse());
    });
    await waitFor(() =>
      expect(result.current.products.map(product => product.id)).toEqual(['2', '1'])
    );
    expect(result.current.allProducts.map(product => product.display_order)).toEqual([1, 2]);
  });
  it('actualiza la lista visible después de ocupar una habitación', async () => {
    let status = 1;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, options?: RequestInit) => {
        if (options?.method === 'PATCH') status = 2;
        return {
          ok: true,
          json: async () => ({ success: true, data: [{ id: '1', name: 'Habitación', status }] })
        };
      })
    );
    const { result } = renderHook(useRooms, { wrapper: wrapper() });
    await waitFor(() => expect(result.current.rooms[0]?.status).toBe(1));
    await act(async () => {
      await result.current.occupyRoom('1');
    });
    await waitFor(() => expect(result.current.rooms[0]?.status).toBe(2));
  });

  it.each(['activar', 'desactivar'])('%s un producto refresca sus presentaciones', async action => {
    let changed = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, options?: RequestInit) => {
        if (options?.method === 'PATCH') changed = true;
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [{ id: '1', name: 'Producto', status: changed ? 0 : 1 }]
          })
        };
      })
    );
    const { result } = renderHook(
      () => ({
        products: useProducts(),
        presentations: useQuery({
          queryKey: ['product-presentations', '1'],
          queryFn: async () => changed,
          staleTime: Infinity
        })
      }),
      { wrapper: wrapper() }
    );
    await waitFor(() => expect(result.current.presentations.data).toBe(false));
    await act(async () => {
      if (action === 'activar') await result.current.products.activateProduct('1');
      else await result.current.products.deactivateProduct('1');
    });
    await waitFor(() => expect(result.current.presentations.data).toBe(true));
  });

  it.each(['activar', 'desactivar'])(
    'no informa éxito al %s si HTTP indica un error',
    async action => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async (_url: string, options?: RequestInit) => ({
          ok: options?.method !== 'PATCH',
          json: async () =>
            options?.method === 'PATCH'
              ? { success: true, message: 'Solicitud rechazada' }
              : { success: true, data: [] }
        }))
      );
      const { result } = renderHook(() => useProducts(), { wrapper: wrapper() });
      await act(async () => {
        if (action === 'activar') await result.current.activateProduct('1');
        else await result.current.deactivateProduct('1');
      });
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('Solicitud rechazada');
    }
  );
});
