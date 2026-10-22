import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useAnfitrionaServicios } from '@/hooks/hostess/useAnfitrionaServicios';
import { useRoleCalendar } from '@/hooks/calendar/useRoleCalendar';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('suma la comisión personal y excluye los servicios anulados', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json({
        success: true,
        data: [
          { id_servicio: 's1', estado: 1, precio_servicio: 50000, comision_usuario: '5000' },
          { id_servicio: 's2', estado: 0, precio_servicio: 90000, comision_usuario: '9000' }
        ]
      })
    )
  );
  const { result } = renderHook(useAnfitrionaServicios);
  await waitFor(() => expect(result.current.totalServices).toBe(2));
  expect(result.current.totalEarnings).toBe(5000);
  expect(result.current).not.toHaveProperty('setIsEditModalOpen');
});

it('consulta solo eventos propios y no suma servicios dos veces ni anulaciones', async () => {
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 12:00:00`;
  const request = vi.fn(async () =>
    Response.json({
      success: true,
      data: [
        { type: 'servicio', date, amount: 5000, estado: 1 },
        { type: 'comision', subType: 'servicio', date, amount: 5000, estado: 1 },
        { type: 'comision', subType: 'venta', date, amount: 1000, estado: 1 },
        { type: 'comision', subType: 'venta', date, amount: 9000, estado: 0 },
        { type: 'anticipo', date, amount: 2000, estado: 0 }
      ]
    })
  );
  vi.stubGlobal('fetch', request);
  const { result } = renderHook(() => useRoleCalendar({ role: 'anfitriona', userId: 'host-1' }));
  await waitFor(() => expect(result.current.calendarData.servicios).toHaveLength(1));
  act(() => result.current.handleDateClick(today));
  await waitFor(() => expect(result.current.modalTotal).toBe(4000));
  expect(request.mock.calls).toHaveLength(2);
  expect((request.mock.calls as unknown as string[][])[0][0]).toContain('/api/events/user?');
  expect((request.mock.calls as unknown as string[][])[1][0]).toBe('/api/services/user');
});
