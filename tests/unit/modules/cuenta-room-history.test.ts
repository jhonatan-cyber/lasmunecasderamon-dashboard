// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import * as history from '@/modules/operacion/cuentas/historial';
import { CuentaQueries } from '@/modules/operacion/cuentas/consultas';
vi.mock('@/lib/database/db', () => ({ query: vi.fn(), withTransaction: vi.fn(), generateUUID: vi.fn() }));
vi.mock('@/lib/business/timezoneService', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/business/timezoneService')>(), getNowInBusinessTimezone: () => '2026-01-01T00:10:00Z', parseBusinessDate: (value: string) => new Date(value) }));
const start = '2026-01-01T00:00:00Z'; const now = '2026-01-01T00:10:00Z';
const segment = { roomId: 'r1', roomName: 'Suite', startedAt: start, endedAt: null, assignedMinutes: 30, consumedMinutes: 0 };
for (const [name, api] of [['módulo', history], ['fachada histórica', CuentaQueries]] as const) describe(`historial de habitaciones: ${name}`, () => {
  it('admite JSON, datos previos y valores inválidos', () => {
    for (const raw of [null, '', 'invalid', '{}', {}, 0]) expect(api.parseRoomHistory(raw)).toEqual([]);
    expect(api.parseRoomHistory([segment])).toEqual([segment]); expect(api.parseRoomHistory(JSON.stringify([segment]))).toEqual([segment]);
    expect(api.stringifyRoomHistory([])).toBeNull(); expect(JSON.parse(api.stringifyRoomHistory([segment])!)).toEqual([segment]);
  });
  it.each([
    [null, 0, null], [{ tiempo: 30, fecha_crea: start }, 30, start],
    [{ tiempo: 30, tiempo_actual: 0, tiempo_inicio_actual: '' }, 0, null],
    [{ tiempo_actual: -10, tiempo_inicio_actual: start }, 0, start],
    [{ tiempo_actual: 'bad' }, 0, null], [{ tiempo_actual: 20, tiempo_inicio_actual: start }, 20, start]
  ])('prioriza el temporizador actual y mantiene compatibilidad: %s', (cuenta, duration, startedAt) => {
    expect(api.getCurrentTimerDuration(cuenta as any)).toBe(duration); expect(api.getCurrentTimerStart(cuenta as any)).toBe(startedAt);
  });
  it('calcula minutos consumidos y nunca devuelve saldos negativos', () => {
    expect(api.getRemainingMinutes(null, new Date(now))).toEqual({ remainingMinutes: 0, elapsedMinutes: 0, isActive: false });
    expect(api.getRemainingMinutes({ tiempo: 30, fecha_crea: start } as any, new Date(now))).toEqual({ remainingMinutes: 20, elapsedMinutes: 10, isActive: true });
    expect(api.getRemainingMinutes({ tiempo: 5, fecha_crea: start } as any, new Date(now))).toEqual({ remainingMinutes: 0, elapsedMinutes: 5, isActive: false });
    expect(api.getRemainingMinutes({ tiempo: 5, fecha_crea: now } as any, new Date(start)).remainingMinutes).toBe(5);
  });
  it('crea una sesión sólo cuando hay habitación y tiempo sin otra abierta', () => {
    expect(api.ensureOpenHistorySegment([], null, 'Suite')).toEqual([]);
    expect(api.ensureOpenHistorySegment([], { habitacion_id: 'r1', tiempo: 0 } as any, 'Suite')).toEqual([]);
    expect(api.ensureOpenHistorySegment([segment], { habitacion_id: 'r1', tiempo: 30 } as any, 'Suite')).toEqual([segment]);
    expect(api.ensureOpenHistorySegment([], { habitacion_id: 'r1', tiempo: 30, fecha_crea: start } as any, 'Suite')).toEqual([segment]);
    expect(api.ensureOpenHistorySegment([], { habitacion_id: 'r1', tiempo: 30 } as any, 'Suite')[0].startedAt).toBe(now);
  });
  it('cierra sólo el último tramo abierto, limita consumo y conserva el original', () => {
    const input = [segment, { ...segment, roomId: 'r2' }];
    const closed = api.closeOpenHistorySegment(input, now, 10);
    expect(closed[0].endedAt).toBeNull(); expect(closed[1]).toMatchObject({ consumedMinutes: 10, remainingMinutes: 20, closedReason: 'manual' }); expect(input[1].endedAt).toBeNull();
    expect(api.closeOpenHistorySegment([segment], now, 100, true, 'charged')[0]).toMatchObject({ consumedMinutes: 30, remainingMinutes: 0, closedReason: 'charged' });
    expect(api.closeOpenHistorySegment([], now, 10)).toEqual([]);
    expect(api.closeOpenHistorySegment([{ ...segment, assignedMinutes: 0 }], now, -10)[0].consumedMinutes).toBe(0);
  });
  it('hidrata tramos activos y cerrados con metadatos antiguos o incompletos', () => {
    const hydrated = api.hydrateRoomHistory([
      segment,
      { ...segment, endedAt: now, consumedMinutes: 0 },
      { ...segment, endedAt: now, consumedMinutes: 5, remainingMinutes: 25 },
      { ...segment, endedAt: now, consumedMinutes: Number.NaN, remainingMinutes: 0 },
      { ...segment, endedAt: now, consumedMinutes: 5, remainingMinutes: 30 },
      { ...segment, startedAt: '', assignedMinutes: 0, consumedMinutes: -5 }
    ], now);
    expect(hydrated[0]).toMatchObject({ consumedMinutes: 10, remainingMinutes: 20, isActive: true });
    expect(hydrated[1]).toMatchObject({ consumedMinutes: 10, remainingMinutes: 20, isActive: false });
    expect(hydrated[2]).toMatchObject({ consumedMinutes: 5, remainingMinutes: 25 });
    expect(hydrated[3].consumedMinutes).toBe(10); expect(hydrated[4].consumedMinutes).toBe(10); expect(hydrated[5].remainingMinutes).toBe(0);
    expect(api.hydrateRoomHistory([])).toEqual([]);
  });
  it('normaliza tiempos de cuentas anteriores sin perder cero explícito', () => {
    expect(api.normalizeCuentaRow(null)).toBeNull();
    expect(api.normalizeCuentaRow({ tiempo: 30 } as any)).toMatchObject({ tiempo_total: 30, tiempo_activo: 30 });
    expect(api.normalizeCuentaRow({ tiempo_total: 0, tiempo_activo: 0, tiempo: 30 } as any)).toMatchObject({ tiempo_total: 0, tiempo_activo: 0 });
    expect(api.normalizeCuentaRow({ tiempo_actual: 10 } as any)).toMatchObject({ tiempo_total: 0, tiempo_activo: 10 });
    expect(api.normalizeCuentaRow({} as any)).toMatchObject({ tiempo_total: 0, tiempo_activo: 0 });
  });
});
it('registra cambios de habitación con y sin tiempo trasladado', () => {
  for (const append of [history.appendHistorySegment, CuentaQueries.appendHistorySegment]) {
    expect(append([], 'r1', 'Suite', start, 30, true)[0]).toMatchObject({ remainingMinutes: 30, carriedFromPrevious: true });
    expect(append([], 'r1', 'Suite', start, 0)[0]).toMatchObject({ remainingMinutes: 0, carriedFromPrevious: false });
  }
});
