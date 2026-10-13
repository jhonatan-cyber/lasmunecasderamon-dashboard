import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useServicioTimerSync } from '@/hooks/servicios/useServicioTimerSync';
const fixture = vi.hoisted(() => ({ estado: 2, pause: vi.fn() }));
vi.mock('@/hooks/servicios/useServicios', () => ({
  useServicios: () => ({ servicios: [{ id: 'service-1', estado: fixture.estado }] })
}));
vi.mock('@/contexts/TimerContext', () => ({
  useTimer: () => ({
    timers: [{ servicioId: 'service-1', isPaused: false, tipoTransaccion: 'servicio' }],
    pauseTimerByServicioId: fixture.pause
  })
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe('sincronización al abrir devoluciones de servicios', () => {
  it('no pausa un servicio que está en proceso', () => {
    fixture.estado = 2;
    renderHook(() => useServicioTimerSync());
    expect(fixture.pause).not.toHaveBeenCalled();
  });
  it('respeta un servicio pausado en el servidor', () => {
    fixture.estado = 3;
    renderHook(() => useServicioTimerSync());
    expect(fixture.pause).toHaveBeenCalledWith('service-1');
  });
});
