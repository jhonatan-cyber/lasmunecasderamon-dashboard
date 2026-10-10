import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useAttendanceDetail } from '@/hooks/attendance/useAttendanceDetail';
vi.mock('@/lib/utils/logger', () => ({ default: { captureException: vi.fn() } }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const response = (id: number, count = 1) => ({
  ok: true,
  json: async () => ({
    success: true,
    data: Array.from({ length: count }, (_, index) => ({ id_asistencia: id + index, sueldo: 100 }))
  })
});
describe('detalle de asistencias', () => {
  it.each([false, true])(
    'ignora respuestas tardías al cambiar empleado o cerrar: %s',
    async close => {
      let finish!: (value: ReturnType<typeof response>) => void;
      const request = vi.fn().mockImplementationOnce(
        () =>
          new Promise(resolve => {
            finish = resolve;
          })
      );
      request.mockResolvedValueOnce(response(2));
      vi.stubGlobal('fetch', request);
      const { result, rerender } = renderHook(useAttendanceDetail, {
        initialProps: { isOpen: true, userId: 1 }
      });
      rerender({ isOpen: !close, userId: 2 });
      expect(request.mock.calls[0][1].signal.aborted).toBe(true);
      if (!close) await waitFor(() => expect(result.current.asistencias[0]?.id_asistencia).toBe(2));
      await act(async () => {
        finish(response(1));
      });
      expect(result.current.asistencias.map(item => item.id_asistencia)).toEqual(close ? [] : [2]);
      expect(result.current.loading).toBe(false);
    }
  );
  it('reinicia la página al cambiar de empleado y rechaza tamaños inválidos', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(response(1, 12)).mockResolvedValueOnce(response(100))
    );
    const { result, rerender } = renderHook(useAttendanceDetail, {
      initialProps: { isOpen: true, userId: 1 }
    });
    await waitFor(() => expect(result.current.totalPages).toBe(3));
    act(() => result.current.handlePageChange(3));
    expect(result.current.paginatedAsistencias).toHaveLength(2);
    act(() => {
      result.current.handlePageChange(NaN);
      result.current.setPageSize(0);
    });
    expect(result.current.currentPage).toBe(3);
    expect(result.current.pageSize).toBe(5);
    rerender({ isOpen: true, userId: 2 });
    await waitFor(() => expect(result.current.asistencias[0]?.id_asistencia).toBe(100));
    expect(result.current.currentPage).toBe(1);
    expect(result.current.paginatedAsistencias).toHaveLength(1);
  });
  it('tolera una respuesta sin una lista de registros', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: {} }) })
    );
    const { result } = renderHook(() => useAttendanceDetail({ isOpen: true, userId: 1 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.asistencias).toEqual([]);
    expect(result.current.totals.totalFinal).toBe(0);
  });
});
