import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { timerNow, resetTimerClock, synchronizeTimerClock } from '@/lib/utils/timerClock';
import { calculateRemainingTime } from '@/lib/utils/timeUtils';
import {
  activeTimers,
  serverOffsetSignal,
  TimerInstance,
  setGlobalExpirationHandler
} from '@/lib/store/timerStore';
import { refreshTimerSnapshot } from '@/lib/store/timerSnapshot';

const utc = Date.parse('2026-10-15T17:00:00Z');
let monotonic = 1000;
const row = (tipoTransaccion: 'venta' | 'servicio' | 'cuenta' = 'venta', extra = {}) => ({
  servicioId: tipoTransaccion,
  tipoTransaccion,
  roomId: 'vip',
  roomName: 'Privado',
  startTime: new Date(utc).toISOString(),
  expiresAt: new Date(utc + 90 * 60000).toISOString(),
  duration: 90,
  isPaused: false,
  remainingTime: 5400,
  ...extra
});
function respond(rows: any[], now = utc) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, serverTime: new Date(now).toISOString(), data: rows })
    })
  );
}
beforeEach(() => {
  resetTimerClock();
  activeTimers.value = [];
  monotonic = 1000;
  vi.spyOn(performance, 'now').mockImplementation(() => monotonic);
  vi.spyOn(Date, 'now').mockReturnValue(utc + 7 * 3600000);
});
afterEach(() => {
  resetTimerClock();
  activeTimers.value = [];
  serverOffsetSignal.value = 0;
  setGlobalExpirationHandler(() => {});
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe('temporizadores UTC con vencimiento del servidor', () => {
  it.each(['venta', 'servicio', 'cuenta'] as const)(
    'respeta 90 minutos en %s con reloj adelantado y ajustes posteriores',
    async tipo => {
      respond([row(tipo)]);
      await refreshTimerSnapshot();
      const timer = activeTimers.peek()[0];
      expect(timer.remainingSeconds.peek()).toBe(5400);
      vi.mocked(Date.now).mockReturnValue(utc - 10 * 3600000);
      monotonic += 60000;
      timer.update(0);
      expect(timer.remainingSeconds.peek()).toBe(5340);
      const expire = vi.fn();
      setGlobalExpirationHandler(expire);
      monotonic += 89 * 60000;
      timer.update(0);
      timer.update(0);
      expect(timer.remainingSeconds.peek()).toBe(0);
      expect(expire).toHaveBeenCalledTimes(1);
    }
  );
  it.each([
    '2026-10-15T17:00:00Z',
    '2026-10-15T14:00:00-03:00',
    '2026-10-15T13:00:00-04:00',
    '2026-10-16T02:00:00+09:00'
  ])('interpreta el mismo instante con offset %s', startTime => {
    synchronizeTimerClock(new Date(utc).toISOString());
    expect(
      calculateRemainingTime({
        startTime,
        expiresAt: new Date(utc + 5400000).toISOString(),
        duration: 90,
        isPaused: false,
        remainingTime: 0
      })
    ).toBe(5400);
  });
  it('mantiene el tiempo congelado y reanuda con un nuevo vencimiento confirmado', async () => {
    respond([row('servicio', { isPaused: true, remainingTime: 1800 })]);
    await refreshTimerSnapshot();
    const timer = activeTimers.peek()[0];
    monotonic += 600000;
    timer.update(0);
    expect(timer.remainingSeconds.peek()).toBe(1800);
    respond(
      [row('servicio', { expiresAt: new Date(utc + 40 * 60000).toISOString() })],
      utc + 10 * 60000
    );
    await refreshTimerSnapshot();
    expect(activeTimers.peek()[0]).toBe(timer);
    expect(timer.isPaused.peek()).toBe(false);
    expect(timer.remainingSeconds.peek()).toBe(1800);
    monotonic += 60000;
    timer.update(0);
    expect(timer.remainingSeconds.peek()).toBe(1740);
  });
  it('recupera el vencimiento real tras recarga y elimina temporizadores que el servidor cerr?', async () => {
    respond([row()], utc + 20 * 60000);
    await refreshTimerSnapshot();
    expect(activeTimers.peek()[0].remainingSeconds.peek()).toBe(4200);
    respond([]);
    await refreshTimerSnapshot();
    expect(activeTimers.peek()).toEqual([]);
  });
  it('deduplica consultas simultaneas y conserva los temporizadores si falla la red', async () => {
    respond([row()]);
    await Promise.all([refreshTimerSnapshot(), refreshTimerSnapshot()]);
    expect(fetch).toHaveBeenCalledTimes(1);
    const previous = activeTimers.peek();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sin red')));
    await expect(refreshTimerSnapshot()).rejects.toThrow('sin red');
    expect(activeTimers.peek()).toBe(previous);
  });
  it('no reinicia un temporizador vencido aunque el reloj local esta atrasado', () => {
    synchronizeTimerClock(new Date(utc + 5400000).toISOString());
    const timer = new TimerInstance(
      {
        ...row(),
        id: 'one',
        startTime: new Date(utc),
        servicioCode: 'V1',
        clienteNombre: 'Cliente',
        isActive: true
      },
      1
    );
    vi.mocked(Date.now).mockReturnValue(utc - 100000);
    timer.update(0);
    expect(timer.isActive.peek()).toBe(false);
    expect(timer.remainingSeconds.peek()).toBe(0);
  });
  it('solicita un estado nuevo si llega una mutacion durante una consulta en vuelo', async () => {
    let release!: (value: unknown) => void;
    const initial = new Promise(resolve => {
      release = resolve;
    });
    const request = vi
      .fn()
      .mockReturnValueOnce(initial)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          serverTime: new Date(utc).toISOString(),
          data: [row('venta', { expiresAt: new Date(utc + 60000).toISOString() })]
        })
      });
    vi.stubGlobal('fetch', request);
    const poll = refreshTimerSnapshot();
    const mutation = refreshTimerSnapshot(true);
    release({
      ok: true,
      json: async () => ({ success: true, serverTime: new Date(utc).toISOString(), data: [row()] })
    });
    await Promise.all([poll, mutation]);
    expect(request).toHaveBeenCalledTimes(2);
    expect(activeTimers.peek()[0].remainingSeconds.peek()).toBe(60);
  });
  it('la referencia avanza sin depender de Date.now', () => {
    synchronizeTimerClock(new Date(utc).toISOString());
    monotonic += 1234;
    expect(timerNow()).toBe(utc + 1234);
  });
});
