import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTimerActions } from '@/hooks/timer/useTimerActions';
import { useTimerSync } from '@/hooks/timer/useTimerSync';
import { activeTimers, serverOffsetSignal, TimerInstance, setGlobalExpirationHandler, startGlobalTimerLoop, stopGlobalTimerLoop, syncTimersWithSignals } from '@/lib/store/timerStore';
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), stored: [] as any[], receive: null as any, success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('@/contexts/TimerContext', () => ({ loadTimersFromStorage: () => mocks.stored, saveTimersToStorage: vi.fn() }));
vi.mock('@/hooks/shared', () => ({ useSSE: (_url: unknown, fn: any) => { mocks.receive = fn; } }));
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: mocks.error, info: mocks.info } }));
vi.mock('@/lib/utils/logger', () => ({ default: { captureException: vi.fn() } }));
const now = new Date('2026-01-01T00:10:00Z');
const data = (extra: any = {}) => ({ id: 't1', servicioId: 's1', roomId: 'r1', roomName: 'Suite', duration: 30, startTime: now, servicioCode: 'S1', clienteNombre: 'Luis', isActive: true, isPaused: false, ...extra });
beforeEach(() => { vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(now); activeTimers.value = []; serverOffsetSignal.value = 0; mocks.stored = []; mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [] }) }); vi.stubGlobal('fetch', mocks.fetch); window.history.replaceState(null, '', '/dashboard'); setGlobalExpirationHandler(vi.fn()); });
afterEach(() => { cleanup(); stopGlobalTimerLoop(); activeTimers.value = []; vi.useRealTimers(); vi.unstubAllGlobals(); window.history.replaceState(null, '', '/'); });
describe('estado y vencimiento de temporizadores', () => {
  it('pausa el consumo, expira una sola vez y entrega callbacks', () => {
    const own = vi.fn(); const global = vi.fn(); setGlobalExpirationHandler(global);
    const timer = new TimerInstance(data({ duration: 1, onExpire: own }), 60); timer.update(0); expect(timer.remainingSeconds.peek()).toBe(60);
    vi.advanceTimersByTime(10000); timer.update(0); expect(timer.remainingSeconds.peek()).toBe(50);
    timer.isPaused.value = true; vi.advanceTimersByTime(10000); timer.update(0); expect(timer.remainingSeconds.peek()).toBe(50);
    timer.isPaused.value = false; vi.advanceTimersByTime(60000); timer.update(0); timer.update(0);
    expect(timer.isActive.peek()).toBe(false); expect(own).toHaveBeenCalledTimes(1); expect(global).toHaveBeenCalledWith(timer);
  });
  it('protege un temporizador nuevo frente a un salto del reloj y expira duración inválida', () => {
    const timer = new TimerInstance(data({ duration: 1 }), 30); timer.update(120000); expect(timer.remainingSeconds.peek()).toBe(60); expect(timer.isActive.peek()).toBe(true); timer.update(120000); expect(timer.remainingSeconds.peek()).toBe(60);
    const zero = new TimerInstance(data({ duration: 0 }), 1); zero.update(0); expect(zero.isActive.peek()).toBe(false);
    const inactive = new TimerInstance(data({ isActive: false, tipoTransaccion: 'cuenta', anfitrionas: 'Ana' }), 60); inactive.update(0); expect(inactive.toPlainObject()).toMatchObject({ isActive: false, anfitrionas: 'Ana', tipoTransaccion: 'cuenta' });
  });
  it('parches parciales conservan campos omitidos y la sincronización conserva la instancia', () => {
    const timer = new TimerInstance(data(), 1800); timer.patch({}); expect(timer.roomName.peek()).toBe('Suite');
    timer.patch({ roomId: 'r2', roomName: 'Otra', servicioCode: 'S2', clienteNombre: 'Ana', duration: 10, startTime: new Date('2026-01-01T00:00:00Z'), tipoTransaccion: 'venta', anfitrionas: 'Lola', datosTemporales: {}, isActive: false, isPaused: true });
    expect(timer.toPlainObject()).toMatchObject({ roomId: 'r2', roomName: 'Otra', tipoTransaccion: 'venta', isPaused: true }); activeTimers.value = [timer];
    syncTimersWithSignals([data({ roomName: 'Actualizada', remainingTime: 600 }), data({ servicioId: 's2', id: 't2' })]); expect(activeTimers.peek()[0]).toBe(timer); expect(timer.roomName.peek()).toBe('Actualizada'); expect(activeTimers.peek()[1].remainingSeconds.peek()).toBe(1800);
    syncTimersWithSignals([data({ servicioId: 's3', remainingTime: 60 })]); expect(activeTimers.peek()).toHaveLength(1); expect(activeTimers.peek()[0].remainingSeconds.peek()).toBe(60);
  });
  it('el bucle global no se duplica y se puede detener repetidamente', () => {
    const timer = new TimerInstance(data(), 1800); activeTimers.value = [timer]; startGlobalTimerLoop(); startGlobalTimerLoop(); vi.advanceTimersByTime(2000); expect(timer.remainingSeconds.peek()).toBe(1798); stopGlobalTimerLoop(); stopGlobalTimerLoop(); vi.advanceTimersByTime(1000); expect(timer.remainingSeconds.peek()).toBe(1798);
  });
});
describe('acciones del temporizador y habitación', () => {
  const setup = (refresh = vi.fn()) => ({ ...renderHook(() => useTimerActions({ onNotificationExpira: vi.fn(), onRefreshCaja: refresh })), refresh });
  it('no inicia sin servicio, habitación o duración válida y ocupa la habitación al iniciar', async () => {
    const h = setup(); for (const [service, room, duration] of [['', 'r1', 30], ['s1', '', 30], ['s1', 'r1', 0], ['s1', 'r1', -1]] as const) await act(async () => h.result.current.startTimer(service, room, 'Suite', duration, 'S1', 'Luis'));
    expect(activeTimers.peek()).toEqual([]); await act(async () => h.result.current.startTimer('s1', 'r1', 'Suite', 30, 'S1', 'Luis', 'Ana', 'venta'));
    expect(activeTimers.peek()[0].toPlainObject()).toMatchObject({ tipoTransaccion: 'venta', anfitrionas: 'Ana' }); expect(JSON.parse(mocks.fetch.mock.calls[0][1].body)).toEqual({ action: 'occupy' });
    await act(async () => h.result.current.startTimer('s2', 'r2', 'Otra', 30, 'S2', 'Luis')); expect(activeTimers.peek()[1].anfitrionas.peek()).toBe('');
  });
  it.each(['servicio', 'venta', 'cuenta', 'otro'])('detiene y libera la habitación para %s', async tipo => {
    const timer = new TimerInstance(data({ tipoTransaccion: tipo }), 1800); activeTimers.value = [timer]; const h = setup();
    await act(async () => h.result.current.stopTimer('missing'));
    await act(async () => h.result.current.stopTimer('t1', true)); expect(activeTimers.peek()).toEqual([]); expect(mocks.fetch).toHaveBeenCalledWith('/api/rooms/r1', expect.any(Object));
    act(() => vi.advanceTimersByTime(100)); expect(h.refresh).toHaveBeenCalledWith('s1'); expect(mocks.success).toHaveBeenCalledWith('Habitación Suite liberada');
  });
  it('conserva ocupada una habitación con otro temporizador activo y admite timers históricos', async () => {
    activeTimers.value = [new TimerInstance(data({ id: 't2', servicioId: 's2' }), 1800)]; const h = setup();
    await act(async () => h.result.current.stopTimer('t1', false, data({ tipoTransaccion: 'servicio' }))); expect(mocks.fetch.mock.calls.some(([url]) => url.startsWith('/api/rooms'))).toBe(false);
    await act(async () => h.result.current.stopTimer('t2')); expect(activeTimers.peek()).toEqual([]);
  });
  it('pausa y reanuda únicamente servicios existentes y presenta fallos de actualización', async () => {
    const timer = new TimerInstance(data(), 1800); activeTimers.value = [timer]; const h = setup();
    act(() => { h.result.current.pauseTimerByServicioId('missing'); h.result.current.resumeTimerByServicioId('missing'); }); expect(mocks.fetch).not.toHaveBeenCalled();
    mocks.fetch.mockRejectedValueOnce(new Error('offline')); await act(async () => h.result.current.pauseTimerByServicioId('s1')); expect(timer.isPaused.peek()).toBe(true); expect(mocks.error).toHaveBeenCalled();
    await act(async () => h.result.current.resumeTimerByServicioId('s1')); expect(timer.isPaused.peek()).toBe(false);
    mocks.fetch.mockRejectedValueOnce(new Error('offline')); await act(async () => h.result.current.startTimer('s2', 'r2', 'Otra', 30, 'S2', 'Luis')); expect(activeTimers.peek()).toHaveLength(2);
  });
  it.each(['same-room', 'different-room', 'no-main'])('el servicio temporal congela el principal: %s', mode => {
    const main = new TimerInstance(data(), 900); if (mode !== 'no-main') activeTimers.value = [main]; const h = setup(); const complete = vi.fn();
    act(() => h.result.current.startTemporaryTimer('s1', mode === 'different-room' ? 'r2' : 'r1', 'Temporal', 5, 'S1', 'Luis', complete, { total: 100 }, 'Ana'));
    const temporary = activeTimers.peek().find(t => t.isTemporary)!; expect(temporary.datosTemporales.peek()).toMatchObject({ tiempo_principal_congelado: mode === 'no-main' ? 300 : 900, estado_principal: 'PAUSADO' });
    if (mode !== 'no-main') expect(main.isPaused.peek()).toBe(true);
    act(() => h.result.current.startTemporaryTimer('s1', 'r1', 'Temporal', 5, 'S1', 'Luis', complete)); expect(activeTimers.peek().filter(t => t.isTemporary)).toHaveLength(1);
    vi.advanceTimersByTime(6 * 60000); temporary.update(0); expect(complete).toHaveBeenCalledTimes(1);
  });
});
describe('sincronización inicial y SSE', () => {
  const setup = (initialized = false) => { const props = { isInitialized: initialized, setIsInitialized: vi.fn(), setServerOffset: vi.fn(), onTimerStopped: vi.fn() }; return { ...renderHook(() => useTimerSync(props)), props }; };
  it('no consulta timers en pantallas públicas', () => { window.history.replaceState(null, '', '/login'); const h = setup(); expect(mocks.fetch).not.toHaveBeenCalled(); expect(h.props.setIsInitialized).toHaveBeenCalledWith(true); });
  it.each(['rejected', 'network'])('restaura únicamente timers vivos ante error %s', async mode => {
    mocks.stored = [data(), data({ id: 'old', servicioId: 'old', startTime: new Date('2025-01-01') })];
    if (mode === 'network') mocks.fetch.mockRejectedValueOnce(new Error('offline')); else mocks.fetch.mockResolvedValueOnce({ json: async () => ({ success: false }) });
    const h = setup(); await act(async () => {}); expect(h.props.setIsInitialized).toHaveBeenCalledWith(true); expect(activeTimers.peek()).toHaveLength(1);
  });
  it('carga timers del servidor, ajusta reloj y liga el temporal al principal', async () => {
    mocks.fetch.mockResolvedValueOnce({ json: async () => ({ success: true, serverTime: now.toISOString(), data: [
      { ...data(), codigo: 'S1', isPaused: true }, { ...data({ id: 't2', servicioId: 's2' }), isTemporary: true, servicioOriginalId: 's1' },
      { ...data({ servicioId: 's3' }), isTemporary: true }, { ...data({ servicioId: 'expired', duration: 0 }) },
      { ...data({ servicioId: 'fresh', duration: 1, startTime: new Date(now.getTime() - 90000) }) }
    ] }) });
    const h = setup(); await act(async () => {}); expect(h.props.setServerOffset).toHaveBeenCalledWith(0); expect(activeTimers.peek()).toHaveLength(4);
    expect(activeTimers.peek().find(t => t.servicioId === 's2')!.datosTemporales.peek()).toMatchObject({ tiempo_principal_congelado: 1800 });
    expect(activeTimers.peek().find(t => t.servicioId === 'fresh')!.remainingSeconds.peek()).toBe(60);
  });
  it('reconecta, actualiza, pausa, reanuda y detiene sin duplicar timers', async () => {
    const h = setup(true); await act(async () => {}); mocks.fetch.mockResolvedValue({ json: async () => ({ success: true, data: [{ servicioId: 's1' }] }) });
    act(() => mocks.receive(null)); act(() => mocks.receive({ type: 'timer_started' }));
    act(() => mocks.receive({ type: 'timer_started', data: { ...data(), codigo: 'S1' } })); act(() => mocks.receive({ type: 'timer_started', data: data() })); expect(activeTimers.peek()).toHaveLength(1);
    act(() => mocks.receive({ type: 'timer_started', data: data({ servicioId: 'expired', duration: 0 }) })); expect(activeTimers.peek()).toHaveLength(1);
    act(() => mocks.receive({ type: 'timer_paused', data: { servicioId: 's1' } })); expect(activeTimers.peek()[0].isPaused.peek()).toBe(true);
    act(() => mocks.receive({ type: 'timer_resumed', data: { servicioId: 's1' } })); expect(activeTimers.peek()[0].isPaused.peek()).toBe(false);
    act(() => mocks.receive({ type: 'timer_updated', data: { servicioId: 's1', duration: 10, roomId: 'r2', roomName: 'Otra', startTime: now, anfitrionas: 'Ana' } })); expect(activeTimers.peek()[0].roomId.peek()).toBe('r2');
    act(() => mocks.receive({ type: 'timer_updated', data: { servicioId: 's1' } })); expect(activeTimers.peek()[0].duration.peek()).toBe(10);
    for (const type of ['timer_updated', 'timer_paused', 'timer_resumed']) act(() => mocks.receive({ type, data: { servicioId: 'missing' } }));
    await act(async () => mocks.receive({ type: 'connected', data: {} })); expect(activeTimers.peek()).toHaveLength(1);
    act(() => mocks.receive({ type: 'timer_stopped', data: { servicioId: 's1' } })); expect(activeTimers.peek()).toEqual([]); expect(h.props.onTimerStopped).toHaveBeenCalledWith('s1');
  });
});
