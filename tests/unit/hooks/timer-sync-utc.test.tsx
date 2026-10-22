import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const sse = vi.hoisted(() => ({ callback: undefined as undefined | ((payload: any) => void) }));
vi.mock('@/hooks/shared', () => ({
  useSSE: (_url: string, callback: (payload: any) => void) => {
    sse.callback = callback;
  }
}));
import { useTimerSync } from '@/hooks/timers/useTimerSync';
import { activeTimers } from '@/lib/store/timerStore';
import { resetTimerClock } from '@/lib/utils/timerClock';
const utc = '2026-10-15T17:00:00Z';
let rows: any[];
beforeEach(() => {
  window.history.replaceState({}, '', '/orders');
  resetTimerClock();
  activeTimers.value = [];
  localStorage.clear();
  rows = [
    {
      servicioId: 'one',
      tipoTransaccion: 'venta',
      duration: 90,
      startTime: utc,
      expiresAt: '2026-10-15T18:30:00Z',
      remainingTime: 5400
    }
  ];
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async () => ({
      ok: true,
      json: async () => ({ success: true, serverTime: utc, data: rows })
    }))
  );
});
afterEach(() => {
  resetTimerClock();
  activeTimers.value = [];
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it('reconcilia pausas y reanudaciones SSE con el vencimiento confirmado', async () => {
  const onTimerStopped = vi.fn();
  const { unmount } = renderHook(() =>
    useTimerSync({
      isInitialized: true,
      setIsInitialized: vi.fn(),
      setServerOffset: vi.fn(),
      onTimerStopped
    })
  );
  await waitFor(() => expect(activeTimers.peek()).toHaveLength(1));
  rows = [{ ...rows[0], isPaused: true, remainingTime: 100 }];
  await act(async () => {
    sse.callback?.({ type: 'timer_paused', data: { servicioId: 'one' } });
  });
  expect(activeTimers.peek()[0].isPaused.peek()).toBe(true);
  expect(activeTimers.peek()[0].remainingSeconds.peek()).toBe(100);
  rows = [{ ...rows[0], isPaused: false, expiresAt: '2026-10-15T17:01:40Z' }];
  await act(async () => {
    sse.callback?.({ type: 'timer_resumed', data: { servicioId: 'one' } });
  });
  expect(activeTimers.peek()[0].remainingSeconds.peek()).toBe(100);
  expect(activeTimers.peek()[0].isPaused.peek()).toBe(false);
  rows = [];
  await act(async () => {
    window.dispatchEvent(new Event('online'));
  });
  expect(activeTimers.peek()).toHaveLength(0);
  expect(onTimerStopped).toHaveBeenCalledWith('one');
  unmount();
});
it('actualiza al volver a la pesta�a y al reconectar SSE', async () => {
  const { unmount } = renderHook(() =>
    useTimerSync({ isInitialized: true, setIsInitialized: vi.fn(), setServerOffset: vi.fn() })
  );
  await waitFor(() => expect(activeTimers.peek()).toHaveLength(1));
  rows = [{ ...rows[0], expiresAt: '2026-10-15T17:10:00Z' }];
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(activeTimers.peek()[0].remainingSeconds.peek()).toBe(600);
  rows = [{ ...rows[0], expiresAt: '2026-10-15T17:05:00Z' }];
  await act(async () => {
    sse.callback?.({ type: 'connected' });
  });
  expect(activeTimers.peek()[0].remainingSeconds.peek()).toBe(300);
  unmount();
});

it('no vence ni restaura una cache usando un reloj local sin sincronizar', async () => {
  localStorage.setItem(
    'roomTimers',
    JSON.stringify([{ ...rows[0], id: 'cached', isActive: true }])
  );
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  const initialized = vi.fn();
  const { unmount } = renderHook(() =>
    useTimerSync({ isInitialized: false, setIsInitialized: initialized, setServerOffset: vi.fn() })
  );
  await waitFor(() => expect(initialized).toHaveBeenCalledWith(true));
  expect(activeTimers.peek()).toHaveLength(0);
  unmount();
});
