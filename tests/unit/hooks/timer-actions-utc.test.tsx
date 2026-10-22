import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useTimerActions } from '@/hooks/timers/useTimerActions';
import { activeTimers } from '@/lib/store/timerStore';
import { resetTimerClock } from '@/lib/utils/timerClock';
afterEach(() => {
  activeTimers.value = [];
  resetTimerClock();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it.each(['venta', 'servicio', 'cuenta'] as const)(
  'iniciar %s conserva el vencimiento guardado y no reinicia 90 minutos',
  async type => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-15T23:00:00Z'));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          serverTime: '2026-10-15T17:20:00Z',
          data: [
            {
              servicioId: 'one',
              tipoTransaccion: type,
              startTime: '2026-10-15T17:00:00Z',
              expiresAt: '2026-10-15T18:30:00Z',
              duration: 90
            }
          ]
        })
      })
    );
    const { result } = renderHook(() => useTimerActions({ onNotificationExpira: vi.fn() }));
    await act(() =>
      result.current.startTimer('one', 'vip', 'Privado', 90, 'V1', 'Cliente', '', type)
    );
    expect(activeTimers.peek()).toHaveLength(1);
    expect(activeTimers.peek()[0].remainingSeconds.peek()).toBe(4200);
    expect(activeTimers.peek()[0].expiresAt.peek()).toBe('2026-10-15T18:30:00Z');
  }
);
it('no inventa un inicio local si falla la sincronizacion del servidor', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  const { result } = renderHook(() => useTimerActions({ onNotificationExpira: vi.fn() }));
  await act(() => result.current.startTimer('one', 'vip', 'Privado', 90, 'V1', 'Cliente'));
  expect(activeTimers.peek()).toEqual([]);
});

it('al vencer un servicio sincroniza el cierre del servidor sin ejecutar un PATCH manual', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, serverTime: new Date().toISOString(), data: [] })
  });
  vi.stubGlobal('fetch', fetchMock);
  const refresh = vi.fn();
  const { result } = renderHook(() =>
    useTimerActions({ onNotificationExpira: vi.fn(), onRefreshCaja: refresh })
  );
  await act(() =>
    result.current.stopTimer('servicio-one', false, {
      id: 'servicio-one',
      servicioId: 'one',
      tipoTransaccion: 'servicio'
    })
  );
  expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
    '/api/timers/active?source=web&cleanup=expired',
    {
      cache: 'no-store'
    }
  );
  expect(refresh).toHaveBeenCalledWith('one');
});

it('conserva el error del servidor cuando falla una finalización manual', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ success: false, message: 'No tienes permiso para finalizar' }),
          { status: 403 }
        )
      )
  );
  const { result } = renderHook(() => useTimerActions({ onNotificationExpira: vi.fn() }));
  await expect(
    result.current.stopTimer('servicio-one', true, {
      id: 'servicio-one',
      servicioId: 'one',
      tipoTransaccion: 'servicio'
    })
  ).rejects.toThrow('No tienes permiso para finalizar');
});
