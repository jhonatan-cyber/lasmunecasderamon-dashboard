import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useRoleCalendar } from '@/hooks/calendar/useRoleCalendar';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('expone el error de una consulta mensual y permite reintentar', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  let failed = true;
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      failed
        ? Response.json({ success: false }, { status: 500 })
        : Response.json({ success: true, data: [] })
    )
  );
  const { result } = renderHook(() => useRoleCalendar({ role: 'cajero', userId: 'cashier-1' }));
  await waitFor(() => expect(result.current.calendarError).toBeTruthy());
  failed = false;
  await act(async () => {
    await result.current.retryCalendar();
  });
  expect(result.current.calendarError).toBe('');
  expect(result.current.isLoading).toBe(false);
});

it('suma importes y estados de texto sin concatenarlos en el detalle del cajero', async () => {
  const date = new Date();
  const stamp = date.toISOString();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const data = url.includes('/attendance/')
        ? [{ fecha: stamp, fecha_crea: stamp, estado: '1', sueldo_final: '10000' }]
        : url.includes('/advances/')
          ? [{ fecha_crea: stamp, estado: '1', monto: '2000' }]
          : url.includes('/tips/')
            ? [{ fecha_crea: stamp, estado: '1', monto: '3000' }]
            : [{ fecha_crea: stamp, estado: '1', total: '4000' }];
      return Response.json({ success: true, data });
    })
  );
  const { result } = renderHook(() => useRoleCalendar({ role: 'cajero', userId: 'cashier-1' }));
  await waitFor(() => expect(result.current.calendarData.propinas).toHaveLength(1));
  act(() => result.current.handleDateClick(date));
  await waitFor(() => expect(result.current.modalTotal).toBe(15000));
  expect(result.current.selectedDataError).toBe('');
  expect(result.current.modalCounts).toMatchObject({
    asistencias: 1,
    anticipos: 1,
    propinas: 1,
    horasExtras: 1
  });
});

it('señala errores del detalle sin presentarlos como una selección vacía', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  let failed = true;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url.includes('dates=') && failed
        ? Response.json({ success: true, data: [] }, { status: 500 })
        : Response.json({ success: true, data: [] })
    )
  );
  const { result } = renderHook(() => useRoleCalendar({ role: 'cajero', userId: 'cashier-1' }));
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  act(() => result.current.handleDateClick(new Date()));
  await waitFor(() => expect(result.current.selectedDataError).toBeTruthy());
  failed = false;
  await act(async () => {
    await result.current.retrySelectedData();
  });
  expect(result.current.selectedDataError).toBe('');
});
