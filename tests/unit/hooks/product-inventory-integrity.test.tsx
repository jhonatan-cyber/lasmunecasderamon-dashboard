import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { Product } from '@/types/product';
import { useProductForm } from '@/hooks/personal/useProductForm';
import { toast } from 'sonner';
vi.unmock('@tanstack/react-query');
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/utils/logger', () => ({ default: { warn: vi.fn() } }));
const clients: QueryClient[] = [];
function wrapper() {
  const client = new QueryClient();
  clients.push(client);
  return function Provider({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  clients.splice(0).forEach(client => client.clear());
});
const product = (id: string) => ({ id, code: id, name: id }) as Product;
const response = (url: string, id: string) => ({
  ok: true,
  json: async () => ({
    success: true,
    data: url.includes('/units')
      ? { total: 1, unidades: [{ id, codigo: id }] }
      : [{ id, nombre: id, stock: 0 }]
  })
});
describe('inventario del formulario de productos', () => {
  it('un fallo al generar stock conserva la edición y actualiza los datos ya guardados', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, options?: RequestInit) =>
        options?.method === 'POST'
          ? {
              ok: false,
              json: async () => ({ success: false, message: 'No se pudo generar stock' })
            }
          : response(url, 'vigente')
      )
    );
    const item = product('1');
    const { result } = renderHook(
      () => useProductForm({ initialValues: item, open: true, categoryId: '1', onSubmit: vi.fn() }),
      { wrapper: wrapper() }
    );
    await waitFor(() => expect(result.current.existentes).toHaveLength(1));
    act(() => result.current.startEditPres(result.current.existentes[0]));
    act(() => result.current.changeEditPresDraft('stock', '5'));
    await act(async () => {
      await result.current.saveEditPres();
    });
    expect(result.current.editingPresId).toBe('vigente');
    expect(result.current.editPresDraft.stock).toBe('5');
    expect(result.current.guardandoPres).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('No se pudo generar stock');
  });
  it('agregar stock bloquea el envío doble', async () => {
    let finish!: (value: object) => void;
    const request = vi.fn(async (url: string, options?: RequestInit) =>
      options?.method === 'POST'
        ? new Promise(resolve => {
            finish = resolve;
          })
        : response(url, 'vigente')
    );
    vi.stubGlobal('fetch', request);
    const item = product('1');
    const { result } = renderHook(
      () => useProductForm({ initialValues: item, open: true, categoryId: '1', onSubmit: vi.fn() }),
      { wrapper: wrapper() }
    );
    await waitFor(() => expect(result.current.existentes).toHaveLength(1));
    act(() => result.current.changeStockExtra('vigente', '5'));
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.agregarStock('vigente');
    });
    await act(async () => {
      await result.current.agregarStock('vigente');
    });
    expect(request.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1);
    await act(async () => {
      finish({ ok: true, json: async () => ({ success: true }) });
      await pending;
    });
    expect(result.current.agregandoStock).toBe(false);
  });
  it('rechaza un aumento excesivo de stock antes de guardar la presentación', async () => {
    const request = vi.fn(async (url: string) => response(url, 'vigente'));
    vi.stubGlobal('fetch', request);
    const item = product('1');
    const { result } = renderHook(
      () => useProductForm({ initialValues: item, open: true, categoryId: '1', onSubmit: vi.fn() }),
      { wrapper: wrapper() }
    );
    await waitFor(() => expect(result.current.existentes).toHaveLength(1));
    act(() => result.current.startEditPres(result.current.existentes[0]));
    act(() => result.current.changeEditPresDraft('stock', '1001'));
    await act(async () => {
      await result.current.saveEditPres();
    });
    expect(request).toHaveBeenCalledTimes(2);
    expect(toast.error).toHaveBeenCalledWith(
      'Stock inválido: puedes agregar hasta 1000 unidades por operación'
    );
  });
  it.each([false, true])(
    'ignora inventario anterior al cambiar de producto o cerrar: %s',
    async close => {
      const pending: (() => void)[] = [];
      const request = vi.fn(async (url: string) =>
        url.includes('producto_id=anterior')
          ? new Promise(resolve => pending.push(() => resolve(response(url, 'anterior'))))
          : response(url, 'nuevo')
      );
      vi.stubGlobal('fetch', request);
      const first = product('anterior');
      const next = product('nuevo');
      const { result, rerender } = renderHook(
        ({ item, open }) =>
          useProductForm({ initialValues: item, open, categoryId: '1', onSubmit: vi.fn() }),
        { initialProps: { item: first, open: true }, wrapper: wrapper() }
      );
      rerender({ item: next, open: !close });
      if (!close) await waitFor(() => expect(result.current.existentes[0]?.id).toBe('nuevo'));
      await act(async () => {
        pending.forEach(finish => finish());
      });
      expect(result.current.existentes.map(item => item.id)).toEqual(close ? [] : ['nuevo']);
      expect(result.current.unidadesCodigos.map(item => item.id)).toEqual(close ? [] : ['nuevo']);
      expect(result.current.cargandoInventario).toBe(false);
    }
  );
  it('un rechazo HTTP no reemplaza el inventario válido al actualizar', async () => {
    let fail = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        fail
          ? { ok: false, json: async () => ({ success: true, message: 'Rechazado', data: [] }) }
          : response(url, 'vigente')
      )
    );
    const item = product('1');
    const { result } = renderHook(
      () => useProductForm({ initialValues: item, open: true, categoryId: '1', onSubmit: vi.fn() }),
      { wrapper: wrapper() }
    );
    await waitFor(() => expect(result.current.cargandoInventario).toBe(false));
    fail = true;
    act(() => result.current.refreshInventario());
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Rechazado'));
    expect(result.current.existentes[0].id).toBe('vigente');
  });
  it('un rechazo al eliminar no confirma éxito ni recarga el inventario', async () => {
    const request = vi.fn(async (url: string, options?: RequestInit) =>
      options?.method === 'DELETE'
        ? { ok: false, json: async () => ({ success: true, message: 'No permitido' }) }
        : response(url, 'vigente')
    );
    vi.stubGlobal('fetch', request);
    const item = product('1');
    const { result } = renderHook(
      () => useProductForm({ initialValues: item, open: true, categoryId: '1', onSubmit: vi.fn() }),
      { wrapper: wrapper() }
    );
    await waitFor(() => expect(result.current.existentes).toHaveLength(1));
    await act(async () => {
      await result.current.deleteExistente('vigente');
    });
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('No permitido');
    expect(request).toHaveBeenCalledTimes(3);
  });
});
