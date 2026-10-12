import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMasterData } from '@/hooks/shared/useMasterData';
import { useGenericFetch } from '@/hooks/shared/useGenericFetch';
vi.mock('@/hooks/shared/useGenericFetch', () => ({
  useGenericFetch: vi.fn(() => ({ data: [], refetch: vi.fn() }))
}));
beforeEach(() => vi.clearAllMocks());
describe('selección de anfitrionas para venta', () => {
  it('consulta las categorías con stock en el bar con una caché propia', () => {
    renderHook(() => useMasterData({ categoriasConStockBar: true }));
    expect(useGenericFetch).toHaveBeenCalledWith(
      '/api/categories?for_sale=1',
      expect.objectContaining({ queryKey: expect.arrayContaining(['for-sale']) })
    );
  });
  it('consulta las sesiones en el local con una caché propia', () => {
    renderHook(() => useMasterData({ soloAnfitrionasEnLocal: true }));
    expect(useGenericFetch).toHaveBeenCalledWith(
      '/api/users?anfitrionas=1&status=active&loggedIn=true&enLocal=true',
      expect.objectContaining({ queryKey: expect.arrayContaining(['en-local']) })
    );
  });
  it('filtra las anfitrionas en el local por defecto para todas las nuevas asignaciones', () => {
    renderHook(() => useMasterData());
    expect(useGenericFetch).toHaveBeenCalledWith(
      '/api/users?anfitrionas=1&status=active&loggedIn=true&enLocal=true',
      expect.objectContaining({ queryKey: expect.arrayContaining(['en-local']) })
    );
  });
});
