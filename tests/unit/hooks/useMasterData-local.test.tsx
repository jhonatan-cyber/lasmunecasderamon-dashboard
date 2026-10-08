import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMasterData } from '@/hooks/shared/useMasterData';
import { useGenericFetch } from '@/hooks/shared/useGenericFetch';
vi.mock('@/hooks/shared/useGenericFetch', () => ({
  useGenericFetch: vi.fn(() => ({ data: [], refetch: vi.fn() }))
}));
beforeEach(() => vi.clearAllMocks());
describe('selección de anfitrionas para venta', () => {
  it.each(['array', 'data', 'items', 'results', 'empty'])('normaliza datos históricos y actuales: %s', async envelope => {
    const records = [
      { id: '1', name: 'Actual', lastName: 'A', status: 1, price: 100, time: 30, comisionAnfitriona: 10, description: 'D', productCount: 2 },
      { id_cliente: '2', id_habitacion: '2', id_usuario: '2', id_categoria: '2', nombre: 'Histórico', apellido: 'B', estado: 0, precio: 200, tiempo: 60, comision_anfitriona: 20, descripcion: 'E', total_products: 3 },
      {}
    ];
    const refetch = vi.fn();
    vi.mocked(useGenericFetch).mockImplementation((_url, options: any) => ({ data: options.transform(envelope === 'array' ? records : envelope === 'empty' ? null : { [envelope]: records }), refetch, isLoading: false, error: null }) as any);
    const h = renderHook(() => useMasterData());
    if (envelope === 'empty') expect(h.result.current.clients).toEqual([]);
    else {
      expect(h.result.current.clients[0]).toMatchObject({ id: '1', name: 'Actual', lastName: 'A', status: 1 });
      expect(h.result.current.clients[1]).toMatchObject({ id: '2', name: 'Histórico', lastName: 'B', status: 0 });
      expect(h.result.current.rooms[0]).toMatchObject({ precio: 100, tiempo: 30, comision_anfitriona: 10 });
      expect(h.result.current.anfitrionas[1]).toMatchObject({ id_usuario: '2', nombre: 'Histórico' });
      expect(h.result.current.categories[2]).toMatchObject({ total_products: 0, productCount: 0 });
    }
    await h.result.current.refreshAll(); expect(refetch).toHaveBeenCalledTimes(4); h.unmount();
  });
  it('consulta las sesiones en el local con una caché propia', () => {
    renderHook(() => useMasterData({ soloAnfitrionasEnLocal: true }));
    expect(useGenericFetch).toHaveBeenCalledWith(
      '/api/users?anfitrionas=1&status=active&loggedIn=true&enLocal=true',
      expect.objectContaining({ queryKey: expect.arrayContaining(['en-local']) })
    );
  });
  it('conserva el padrón completo para los otros módulos', () => {
    renderHook(() => useMasterData());
    expect(useGenericFetch).toHaveBeenCalledWith(
      '/api/users?anfitrionas=1&status=active',
      expect.any(Object)
    );
  });
});
