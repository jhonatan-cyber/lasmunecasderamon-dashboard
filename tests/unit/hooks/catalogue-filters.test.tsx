import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRoomForm } from '@/hooks/personal/useRoomForm';
import { useProductCart } from '@/hooks/shared/useProductCart';
import { useGenericFilters } from '@/hooks/shared/useGenericFilters';
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));
afterEach(cleanup);
describe('habitaciones y carrito', () => {
  it('valida los campos requeridos y normaliza precio, tiempo y comisión', () => {
    const onSubmit = vi.fn(); const h = renderHook(() => useRoomForm({ open: true, onSubmit }));
    act(() => h.result.current.handleSubmit({ preventDefault: vi.fn() } as any)); expect(Object.keys(h.result.current.errors)).toEqual(['name', 'price', 'time']);
    for (const [name, value] of [['name', 'suite uno'], ['price', 'Bs 1000'], ['time', '30'], ['comision_anfitriona', 'Bs 200']]) act(() => h.result.current.handleChange({ target: { name, value } } as any));
    act(() => h.result.current.handleSubmit({ preventDefault: vi.fn() } as any)); expect(onSubmit).toHaveBeenCalledWith({ name: 'Suite Uno', price: '1.000', time: '30', comision_anfitriona: '200' });
    act(() => h.result.current.handleChange({ target: { name: 'time', value: 'bad' } } as any)); act(() => h.result.current.handleSubmit({ preventDefault: vi.fn() } as any)); expect(h.result.current.errors.time).toBeTruthy();
  });
  it.each([null, { name: 'Suite', price: 1200, time: 30, comision_anfitriona: 100 }, { name: '', price: 0, time: 0, comision_anfitriona: 0 }])('restaura valores iniciales al salir del campo vacío: %s', initial => {
    const h = renderHook(() => useRoomForm({ open: true, initialValues: initial as any, onSubmit: vi.fn() }));
    for (const name of ['price', 'time', 'comision_anfitriona', 'name']) {
      act(() => h.result.current.handleFocus({ target: { name } } as any));
      act(() => h.result.current.handleBlur({ target: { name } } as any));
    }
    expect(h.result.current.form.price).toBe(initial?.price ? '1.200' : '');
    expect(h.result.current.form.time).toBe(initial?.time ? '30' : '');
  });
  it('suma productos repetidos, conserva otros y actualiza los totales al quitar unidades', () => {
    const h = renderHook(() => useProductCart());
    act(() => h.result.current.setCantidad(1, 2)); act(() => h.result.current.agregarProducto({ id_producto: 1, nombre: 'Ron', precio: 100, categoria_nombre: 'Bebidas', comision: 10 }));
    act(() => h.result.current.agregarProducto({ id: 2, name: 'Agua', price: 10 }));
    act(() => h.result.current.agregarProducto({ id: 1, name: 'Ron', price: 100, selectedHostesses: [3], isChampagne: true }));
    expect(h.result.current.total).toBe(310); expect(h.result.current.productos[0]).toMatchObject({ cantidad: 3, selectedHostesses: [3], isChampagne: true });
    act(() => h.result.current.actualizarCantidad(0, 1)); expect(h.result.current.total).toBe(110);
    act(() => h.result.current.actualizarCantidad(1, 0)); expect(h.result.current.productos).toHaveLength(1);
    act(() => h.result.current.eliminarProducto(0)); expect(h.result.current.total).toBe(0);
    act(() => h.result.current.limpiarCarrito()); expect(h.result.current.cantidades).toEqual({});
  });
});
describe('búsqueda, ordenación y páginas del catálogo', () => {
  const data = [{ name: 'Beta', score: 2, status: 1 }, { name: 'Alfa', score: 1, status: 0 }, { name: 'Gamma', score: 3, status: 1 }];
  it('busca sin distinguir mayúsculas, filtra estado y reinicia la página', () => {
    const h = renderHook(() => useGenericFilters(data, { searchFields: ['name', 'score'], initialPageSize: 1, initialSortBy: 'name', initialSortOrder: 'asc' }));
    expect(h.result.current.totalPages).toBe(3); expect(h.result.current.paginatedData[0].name).toBe('Alfa');
    act(() => h.result.current.setPage(2)); act(() => h.result.current.setSearchTerm('BETA')); expect(h.result.current.page).toBe(1); expect(h.result.current.filteredData).toEqual([data[0]]);
    act(() => { h.result.current.setSearchTerm(''); h.result.current.setFilterStatus(1); h.result.current.setSortOrder('desc'); }); expect(h.result.current.filteredData.map(x => x.name)).toEqual(['Gamma', 'Beta']);
    act(() => h.result.current.setPageSize(5)); expect(h.result.current.paginatedData).toHaveLength(2);
  });
  it.each(['asc', 'desc'] as const)('ordena números, fechas y valores ausentes en %s', order => {
    for (const values of [[1, 3, 2], [new Date('2026-01-01'), new Date('2026-01-03'), new Date('2026-01-02')], [null, null, 1, 2], [true, false, true]]) {
      const h = renderHook(() => useGenericFilters(values.map((value, id) => ({ id, value })), { initialSortBy: 'value', initialSortOrder: order }));
      expect(h.result.current.filteredData).toHaveLength(values.length);
      if (typeof values[0] === 'number') expect(h.result.current.filteredData[0].value).toBe(order === 'asc' ? 1 : 3);
      h.unmount();
    }
  });
  it('mantiene una página para resultados vacíos y admite datos sin estado ni campos de búsqueda', () => {
    const h = renderHook(() => useGenericFilters([{ id: 1 }]));
    act(() => { h.result.current.setSearchTerm('x'); h.result.current.setFilterStatus(1); h.result.current.setSortBy(''); }); expect(h.result.current.filteredData).toEqual([{ id: 1 }]);
    const empty = renderHook(() => useGenericFilters([])); expect(empty.result.current.totalPages).toBe(1);
  });
});
