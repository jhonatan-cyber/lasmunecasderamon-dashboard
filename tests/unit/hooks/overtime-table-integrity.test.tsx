import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useOvertimeTable } from '@/hooks/personal/useOvertimeTable';
import type { Overtime } from '@/types/overtime';
afterEach(cleanup);
const row = (id: string, hours: number | string = 2, total: number | string = 10) =>
  ({
    id_usuario: id,
    usuario: `Empleado ${id}`,
    hora: hours,
    total,
    estado: 1,
    fecha_crea: '2026-10-10'
  }) as Overtime;
describe('tabla de horas extras', () => {
  it('suma importes numéricos recibidos como texto sin modificar los registros originales', () => {
    const data = [row('1', '2', '10'), row('1', '3', '20')];
    const { result } = renderHook(() => useOvertimeTable({ overtime: data }));
    expect(result.current.processedData[0]).toMatchObject({ hora: 5, total: 30 });
    expect(data[0].hora).toBe('2');
  });
  it('al buscar vuelve a la primera página y recorta espacios', () => {
    const data = Array.from({ length: 12 }, (_, index) => row(String(index)));
    const { result } = renderHook(() => useOvertimeTable({ overtime: data }));
    act(() => result.current.setPage(2));
    expect(result.current.paginatedData).toHaveLength(2);
    act(() => result.current.setSearchTerm(' Empleado 11 '));
    expect(result.current.page).toBe(1);
    expect(result.current.paginatedData[0].id_usuario).toBe('11');
  });
  it('una lista reducida conserva una página válida y rechaza tamaños inválidos', () => {
    const { result, rerender } = renderHook(({ data }) => useOvertimeTable({ overtime: data }), {
      initialProps: { data: Array.from({ length: 12 }, (_, index) => row(String(index))) }
    });
    act(() => result.current.setPage(2));
    rerender({ data: [row('1')] });
    expect(result.current.page).toBe(1);
    expect(result.current.paginatedData).toHaveLength(1);
    act(() => {
      result.current.setPageSize(0);
      result.current.setPage(Infinity);
    });
    expect(result.current.pageSize).toBe(10);
    expect(result.current.page).toBe(1);
  });
});
