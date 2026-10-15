import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('@/lib/database/db', () => ({ query: mocks.query }));
vi.mock('@/modules/ventas', () => ({ finalizarVentasTemporizadas: vi.fn() }));
vi.mock('@/modules/identidad', () => ({ actualizarDisponibilidad: vi.fn() }));
vi.mock('@/modules/operacion/cuentas/servicio', () => ({ finalizarSesionHabitacion: vi.fn() }));
vi.mock('@/modules/operacion/facturacion/servicio', () => ({
  liberarHabitacionPorAnulacion: vi.fn()
}));
import { TimerRepository } from '@/modules/operacion/temporizadores/consultas';
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});
describe('contrato UTC para ventas, servicios y cuentas', () => {
  it('serializa inicio y vencimiento UTC y congela los pausados', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-15T17:00:00Z'));
    mocks.query
      .mockResolvedValueOnce([
        {
          id: 'servicio',
          tipoTransaccion: 'servicio',
          estado: 2,
          duration: 90,
          startTime: new Date('2026-10-15T17:00:00Z')
        }
      ])
      .mockResolvedValueOnce([
        {
          id: 'venta',
          tipoTransaccion: 'venta',
          estado: 3,
          duration: 90,
          startTime: new Date('2026-10-15T16:00:00Z'),
          pausedAt: new Date('2026-10-15T16:30:00Z')
        }
      ])
      .mockResolvedValueOnce([
        {
          id: 'cuenta',
          tipoTransaccion: 'cuenta',
          estado: 1,
          duration: 90,
          startTime: new Date('2026-10-15T17:00:00Z')
        }
      ]);
    const timers = await TimerRepository.getActive();
    expect(timers.map(t => t.remainingTime)).toEqual([5400, 3600, 5400]);
    expect(timers.map(t => t.startTime)).toEqual([
      '2026-10-15T17:00:00.000Z',
      '2026-10-15T16:00:00.000Z',
      '2026-10-15T17:00:00.000Z'
    ]);
    expect(timers.map(t => t.expiresAt)).toEqual([
      '2026-10-15T18:30:00.000Z',
      '2026-10-15T17:30:00.000Z',
      '2026-10-15T18:30:00.000Z'
    ]);
    for (const [sql, parameters] of mocks.query.mock.calls) {
      expect(sql).toContain("AT TIME ZONE 'America/Santiago'");
      expect(parameters).toEqual(['2026-10-15T17:00:00.000Z']);
    }
  });
});
