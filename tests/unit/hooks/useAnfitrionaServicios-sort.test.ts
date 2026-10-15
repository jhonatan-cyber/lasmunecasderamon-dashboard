import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useAnfitrionaServicios } from '@/hooks/anfitriona/useAnfitrionaServicios';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('comparte el orden entre el selector y las columnas y vuelve a la primera página', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            id_servicio: 1,
            codigo: 'A',
            estado: 2,
            comision_usuario: 1000,
            fecha_crea: '2026-10-01T12:00:00Z'
          },
          {
            id_servicio: 2,
            codigo: 'B',
            estado: 2,
            comision_usuario: 3000,
            fecha_crea: '2026-10-02T12:00:00Z'
          }
        ]
      })
    })
  );
  const { result } = renderHook(() => useAnfitrionaServicios());
  await waitFor(() => expect(result.current.services).toHaveLength(2));
  act(() => {
    result.current.setRowsPerPage(1);
    result.current.setPage(2);
  });
  act(() => result.current.setSort('comision_usuario', 'desc'));
  expect(result.current.page).toBe(1);
  expect(result.current.paginatedServices[0].id_servicio).toBe(2);
  act(() => result.current.handleSort('comision_usuario'));
  expect(result.current.sortDirection).toBe('asc');
  expect(result.current.paginatedServices[0].id_servicio).toBe(1);
});
