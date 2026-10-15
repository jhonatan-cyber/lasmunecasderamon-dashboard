import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { activeTimers, serverOffsetSignal, TimerInstance } from '@/lib/store/timerStore';
import { resetTimerClock } from '@/lib/utils/timerClock';
import { useTimerActions } from '@/hooks/timer/useTimerActions';
import { useServiceLogic } from '@/hooks/servicios/useServiceLogic';

const fixture = vi.hoisted(() => ({ servicios: [] as any[], duration: 2 }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/hooks/servicios/useServicios', () => ({
  useServicios: () => ({
    servicios: fixture.servicios,
    getServicios: vi.fn(),
    patchServicio: vi.fn(),
    removeServicioFromState: vi.fn()
  }),
  useAllServicios: () => ({ servicios: fixture.servicios })
}));

beforeEach(() => {
  activeTimers.value = [];
  serverOffsetSignal.value = 0;
  resetTimerClock();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async (url: string) => ({
      ok: true,
      json: async () => ({
        success: true,
        serverTime: new Date(Date.now() + serverOffsetSignal.peek()).toISOString(),
        data: [
          ...activeTimers
            .peek()
            .filter(t => !t.isTemporary)
            .map(t => ({
              ...t.toPlainObject(),
              codigo: 'MAIN',
              isPaused: true,
              remainingTime: t.remainingSeconds.peek()
            })),
          {
            servicioId: 'adicional',
            roomId: 'vip',
            roomName: 'Vip',
            startTime: new Date(Date.now() + serverOffsetSignal.peek()).toISOString(),
            duration: fixture.duration,
            isPaused: false,
            isTemporary: true,
            servicioOriginalId: 'original',
            tipoTransaccion: 'servicio',
            codigo: 'TEMP'
          }
        ]
      })
    }))
  );
  fixture.duration = 2;
  fixture.servicios = [
    { id: 'original', estado: 3 },
    { id: 'adicional', estado: 2, es_temporal: 1, servicio_original_id: 'original' },
    { id: 'otra', estado: 2 }
  ];
});
afterEach(() => {
  activeTimers.value = [];
  resetTimerClock();
  serverOffsetSignal.value = 0;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('servicio adicional', () => {
  it('oculta el principal antes de paginar y lo muestra al finalizar el adicional', () => {
    const { result, rerender } = renderHook(() => useServiceLogic());
    expect(result.current.currentServicios.map(s => s.id)).toEqual(['adicional', 'otra']);
    fixture.servicios = fixture.servicios.map(s =>
      s.id === 'adicional' ? { ...s, estado: 1 } : s
    );
    rerender();
    expect(result.current.currentServicios.map(s => s.id)).toEqual(['original', 'otra']);
  });

  it('finalizar hace una sola petición y no borra el temporizador si el servidor falla', async () => {
    const timer = new TimerInstance(
      {
        id: 'temp-timer',
        servicioId: 'adicional',
        roomId: 'vip',
        roomName: 'Vip',
        duration: 2,
        startTime: new Date(),
        servicioCode: 'TEMP',
        clienteNombre: 'Cliente',
        isActive: true,
        isPaused: false,
        isTemporary: true
      },
      120
    );
    activeTimers.value = [timer];
    const request = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal('fetch', request);
    const { result } = renderHook(() => useTimerActions({ onNotificationExpira: vi.fn() }));
    await expect(result.current.stopTimer('temp-timer', true)).rejects.toThrow(
      'finalizar el servicio'
    );
    expect(activeTimers.peek()).toEqual([timer]);
    expect(request).toHaveBeenCalledTimes(1);
    request.mockClear();
    request.mockResolvedValue({ ok: true });
    await act(() => result.current.stopTimer('temp-timer', true));
    expect(request).toHaveBeenCalledTimes(1);
    expect(activeTimers.peek()).toEqual([]);
  });

  it('no elimina el temporizador de venta ni libera la habitación cuando falla el cierre', async () => {
    const timer = new TimerInstance(
      {
        id: 'sale-timer',
        servicioId: 'sale-1',
        roomId: 'vip',
        roomName: 'Vip',
        duration: 2,
        startTime: new Date(),
        servicioCode: 'SALE',
        clienteNombre: 'Cliente',
        isActive: true,
        isPaused: false,
        tipoTransaccion: 'venta'
      },
      120
    );
    activeTimers.value = [timer];
    const request = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal('fetch', request);
    const { result } = renderHook(() => useTimerActions({ onNotificationExpira: vi.fn() }));
    await expect(result.current.stopTimer('sale-timer', true)).rejects.toThrow(
      'finalizar la venta'
    );
    expect(activeTimers.peek()).toEqual([timer]);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toBe('/api/sales/sale-1');
    request.mockClear();
    request.mockResolvedValue({ ok: true });
    await act(() => result.current.stopTimer('sale-timer', true));
    expect(activeTimers.peek()).toEqual([]);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it.each([-708000, 708000])(
    'mantiene los 2 minutos aunque el reloj del servidor difiera %i ms',
    async offset => {
      vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-10-13T15:00:00Z').getTime());
      serverOffsetSignal.value = offset;
      const { result } = renderHook(() => useTimerActions({ onNotificationExpira: vi.fn() }));
      await act(() =>
        result.current.startTemporaryTimer(
          'original',
          'vip',
          'Vip',
          2,
          'ADICIONAL',
          'Cliente',
          vi.fn(),
          {
            servicio_temporal_id: 'adicional',
            servicio_original_id: 'original'
          }
        )
      );
      resetTimerClock();
      const adicional = activeTimers.peek()[0];
      act(() => adicional.update(offset));
      expect(adicional.remainingSeconds.peek()).toBe(120);
      vi.mocked(Date.now).mockReturnValue(new Date('2026-10-13T15:00:01Z').getTime());
      act(() => adicional.update(offset));
      expect(adicional.remainingSeconds.peek()).toBe(119);
      vi.restoreAllMocks();
    }
  );

  it('inicia el adicional con su propio identificador y duración, conservando el tiempo principal', async () => {
    fixture.duration = 30;
    activeTimers.value = [
      new TimerInstance(
        {
          id: 'main-timer',
          servicioId: 'original',
          roomId: 'vip',
          roomName: 'Vip',
          duration: 60,
          startTime: new Date(),
          servicioCode: 'MAIN',
          clienteNombre: 'Cliente',
          isActive: true,
          isPaused: false
        },
        708
      )
    ];
    const { result } = renderHook(() => useTimerActions({ onNotificationExpira: vi.fn() }));
    await act(() =>
      result.current.startTemporaryTimer(
        'original',
        'vip',
        'Vip',
        30,
        'ADICIONAL',
        'Cliente',
        vi.fn(),
        {
          servicio_temporal_id: 'adicional',
          servicio_original_id: 'original'
        }
      )
    );
    const [main, adicional] = activeTimers.peek();
    expect(main.isPaused.peek()).toBe(true);
    expect(main.remainingSeconds.peek()).toBe(708);
    expect(adicional.servicioId).toBe('adicional');
    expect(adicional.isPaused.peek()).toBe(false);
    expect(adicional.remainingSeconds.peek()).toBe(1800);
    expect(adicional.datosTemporales.peek().servicio_original_id).toBe('original');
    await act(() =>
      result.current.startTemporaryTimer(
        'original',
        'vip',
        'Vip',
        30,
        'ADICIONAL',
        'Cliente',
        vi.fn()
      )
    );
    expect(activeTimers.peek()).toHaveLength(2);
  });
});
