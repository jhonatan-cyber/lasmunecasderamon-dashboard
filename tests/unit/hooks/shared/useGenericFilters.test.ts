import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useGenericFilters } from '@/hooks/shared/useGenericFilters';

const rows = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, name: `Cliente ${i + 1}` }));
const options = {
  searchFields: ['name'] as 'name'[],
  initialPageSize: 2,
  initialSortBy: 'id',
  initialSortOrder: 'asc' as const
};

describe('filtros y paginación compartidos', () => {
  it('vuelve a la última página disponible cuando se eliminan sus registros', () => {
    const { result, rerender } = renderHook(({ data }) => useGenericFilters(data, options), {
      initialProps: { data: rows }
    });
    act(() => result.current.setPage(3));
    expect(result.current.paginatedData.map(row => row.id)).toEqual([5, 6]);
    rerender({ data: rows.slice(0, 4) });
    expect(result.current.page).toBe(2);
    expect(result.current.totalPages).toBe(2);
    expect(result.current.paginatedData.map(row => row.id)).toEqual([3, 4]);
  });

  it('ignora espacios alrededor del texto y reinicia la página al buscar', () => {
    const { result } = renderHook(() => useGenericFilters(rows, options));
    act(() => result.current.setPage(3));
    act(() => result.current.setSearchTerm('  CLIENTE 2  '));
    expect(result.current.page).toBe(1);
    expect(result.current.paginatedData.map(row => row.id)).toEqual([2]);
  });

  it('una lista vacía o una página inválida conserva una paginación válida', () => {
    const { result, rerender } = renderHook(({ data }) => useGenericFilters(data, options), {
      initialProps: { data: rows }
    });
    act(() => result.current.setPage(NaN));
    expect(result.current.page).toBe(1);
    act(() => result.current.setPage(99));
    expect(result.current.page).toBe(3);
    rerender({ data: [] });
    expect(result.current.page).toBe(1);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.paginatedData).toEqual([]);
  });

  it('ordenar no modifica la lista original', () => {
    const { result } = renderHook(() => useGenericFilters(rows, options));
    act(() => result.current.setSortOrder('desc'));
    expect(result.current.paginatedData.map(row => row.id)).toEqual([6, 5]);
    expect(rows.map(row => row.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
