vi.mock('@/modules/identidad', async () => import('@/modules/identidad/disponibilidad/servicio'));
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: vi.fn(() => '2026-01-15 12:00:00')
}));

import { RoomManager } from '@/lib/services/RoomManager';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import type { TransactionQuery } from '@/lib/database/db';

type Handler = { match: RegExp; result: unknown };

function makeTrx(handlers: Handler[] = []) {
  const calls: Array<{ sql: string; params?: unknown[] }> = [];
  const trx = vi.fn(async (sql: string, params?: unknown[]) => {
    calls.push({ sql, params });
    const h = handlers.find(x => x.match.test(sql));
    return h ? h.result : [];
  }) as unknown as TransactionQuery & ReturnType<typeof vi.fn>;
  return { trx: trx as any, calls };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RoomManager.pauseConflictingServices', () => {
  it('retorna undefined sin tocar trx si hostessIds está vacío', async () => {
    const { trx, calls } = makeTrx();

    const result = await RoomManager.pauseConflictingServices(trx, []);

    expect(result).toBeUndefined();
    expect(calls).toHaveLength(0);
  });

  it('retorna undefined si hostessIds es null/undefined', async () => {
    const { trx, calls } = makeTrx();

    await expect(RoomManager.pauseConflictingServices(trx, null as any)).resolves.toBeUndefined();
    expect(calls).toHaveLength(0);
  });

  it('pausa servicios y ventas activas de las anfitrionas', async () => {
    const { trx, calls } = makeTrx([
      { match: /SELECT DISTINCT s\.id_servicio/, result: [{ id_servicio: 'serv-1' }] },
      { match: /SELECT DISTINCT v\.id_venta/, result: [{ id_venta: 'venta-1' }] }
    ]);

    const result = await RoomManager.pauseConflictingServices(trx, ['anf-1', 'anf-2']);

    expect(result).toEqual({ pausedServicios: 1, pausedVentas: 1 });

    const updateServ = calls.find(c => /UPDATE servicios SET estado = 3/.test(c.sql));
    expect(updateServ).toBeDefined();
    expect(updateServ!.params).toEqual(['2026-01-15 12:00:00', 'serv-1']);

    const updateVent = calls.find(c => /UPDATE ventas SET estado = 3/.test(c.sql));
    expect(updateVent).toBeDefined();
    expect(updateVent!.params).toEqual(['2026-01-15 12:00:00', 'venta-1']);
  });

  it('excluye servicio/venta cuando se pasan exclude*', async () => {
    const { trx, calls } = makeTrx([
      { match: /SELECT DISTINCT s\.id_servicio/, result: [] },
      { match: /SELECT DISTINCT v\.id_venta/, result: [] }
    ]);

    const result = await RoomManager.pauseConflictingServices(
      trx,
      ['anf-1'],
      'serv-actual',
      'venta-actual'
    );

    expect(result).toEqual({ pausedServicios: 0, pausedVentas: 0 });

    const selectServ = calls.find(c => /SELECT DISTINCT s\.id_servicio/.test(c.sql));
    expect(selectServ!.sql).toContain('AND s.id_servicio != ?');
    expect(selectServ!.params).toEqual(['serv-actual', 'anf-1']);

    const selectVent = calls.find(c => /SELECT DISTINCT v\.id_venta/.test(c.sql));
    expect(selectVent!.sql).toContain('AND v.id_venta != ?');
    expect(selectVent!.params).toEqual(['venta-actual', 'anf-1']);
  });

  it('no emite UPDATE si no hay filas que pausar', async () => {
    const { trx, calls } = makeTrx([
      { match: /SELECT DISTINCT s\.id_servicio/, result: [] },
      { match: /SELECT DISTINCT v\.id_venta/, result: [] }
    ]);

    await RoomManager.pauseConflictingServices(trx, ['anf-1']);

    expect(calls.some(c => /UPDATE servicios/.test(c.sql))).toBe(false);
    expect(calls.some(c => /UPDATE ventas/.test(c.sql))).toBe(false);
  });

  it('construye placeholders según cantidad de hostessIds', async () => {
    const { trx, calls } = makeTrx([
      { match: /SELECT DISTINCT s\.id_servicio/, result: [] },
      { match: /SELECT DISTINCT v\.id_venta/, result: [] }
    ]);

    await RoomManager.pauseConflictingServices(trx, ['a', 'b', 'c']);

    const selectServ = calls.find(c => /SELECT DISTINCT s\.id_servicio/.test(c.sql));
    expect(selectServ!.sql).toContain('ds.usuario_id IN (?,?,?)');
    expect(selectServ!.params).toEqual(['a', 'b', 'c']);
  });
});

describe('RoomManager.resumeRoomLogic', () => {
  it('retorna undefined si habitacionId está vacío', async () => {
    const { trx, calls } = makeTrx();

    await expect(RoomManager.resumeRoomLogic(trx, '')).resolves.toBeUndefined();
    expect(calls).toHaveLength(0);
  });

  it('libera la habitación si no hay nada pausado', async () => {
    const { trx, calls } = makeTrx([
      { match: /SELECT id_venta, paused_at/, result: [] },
      { match: /SELECT id_servicio, paused_at/, result: [] }
    ]);

    await RoomManager.resumeRoomLogic(trx, 'hab-1');

    const free = calls.find(c => /UPDATE habitaciones SET estado = 1/.test(c.sql));
    expect(free).toBeDefined();
    expect(free!.params).toEqual(['hab-1']);
  });

  it('reanuda la venta pausada más reciente si es más nueva que el servicio', async () => {
    const { trx, calls } = makeTrx([
      {
        match: /SELECT id_venta, paused_at/,
        result: [{ id_venta: 'venta-9', paused_at: '2026-01-15 11:50:00' }]
      },
      {
        match: /SELECT id_servicio, paused_at/,
        result: [{ id_servicio: 'serv-3', paused_at: '2026-01-15 11:00:00' }]
      }
    ]);

    await RoomManager.resumeRoomLogic(trx, 'hab-1');

    const resumeVenta = calls.find(c => /UPDATE ventas\s+SET estado = 2/.test(c.sql));
    expect(resumeVenta).toBeDefined();
    expect(resumeVenta!.params).toEqual(['2026-01-15 12:00:00', 'venta-9']);
    expect(calls.some(c => /UPDATE servicios\s+SET estado = 2/.test(c.sql))).toBe(false);
    expect(calls.some(c => /UPDATE habitaciones SET estado = 1/.test(c.sql))).toBe(false);
  });

  it('reanuda el servicio si su paused_at es más reciente que la venta', async () => {
    const { trx, calls } = makeTrx([
      {
        match: /SELECT id_venta, paused_at/,
        result: [{ id_venta: 'venta-1', paused_at: '2026-01-15 10:00:00' }]
      },
      {
        match: /SELECT id_servicio, paused_at/,
        result: [{ id_servicio: 'serv-7', paused_at: '2026-01-15 11:45:00' }]
      }
    ]);

    await RoomManager.resumeRoomLogic(trx, 'hab-1');

    const resumeServ = calls.find(c => /UPDATE servicios\s+SET estado = 2/.test(c.sql));
    expect(resumeServ).toBeDefined();
    expect(resumeServ!.params).toEqual(['2026-01-15 12:00:00', 'serv-7']);
    expect(calls.some(c => /UPDATE ventas\s+SET estado = 2/.test(c.sql))).toBe(false);
  });

  it('reanuda servicio si solo hay servicio pausado', async () => {
    const { trx, calls } = makeTrx([
      { match: /SELECT id_venta, paused_at/, result: [] },
      {
        match: /SELECT id_servicio, paused_at/,
        result: [{ id_servicio: 'serv-2', paused_at: '2026-01-15 11:00:00' }]
      }
    ]);

    await RoomManager.resumeRoomLogic(trx, 'hab-1');

    expect(calls.some(c => /UPDATE servicios\s+SET estado = 2/.test(c.sql))).toBe(true);
    expect(calls.some(c => /UPDATE ventas\s+SET estado = 2/.test(c.sql))).toBe(false);
  });

  it('reanuda venta si solo hay venta pausada', async () => {
    const { trx, calls } = makeTrx([
      {
        match: /SELECT id_venta, paused_at/,
        result: [{ id_venta: 'venta-5', paused_at: '2026-01-15 11:00:00' }]
      },
      { match: /SELECT id_servicio, paused_at/, result: [] }
    ]);

    await RoomManager.resumeRoomLogic(trx, 'hab-1');

    expect(calls.some(c => /UPDATE ventas\s+SET estado = 2/.test(c.sql))).toBe(true);
    expect(calls.some(c => /UPDATE servicios\s+SET estado = 2/.test(c.sql))).toBe(false);
  });

  it('excluye venta/servicio actual en las selects', async () => {
    const { trx, calls } = makeTrx([
      { match: /SELECT id_venta, paused_at/, result: [] },
      { match: /SELECT id_servicio, paused_at/, result: [] }
    ]);

    await RoomManager.resumeRoomLogic(trx, 'hab-1', 'serv-x', 'venta-x');

    const selectV = calls.find(c => /SELECT id_venta, paused_at/.test(c.sql));
    expect(selectV!.sql).toContain('AND id_venta != ?');
    expect(selectV!.params).toEqual(['hab-1', 'venta-x']);

    const selectS = calls.find(c => /SELECT id_servicio, paused_at/.test(c.sql));
    expect(selectS!.sql).toContain('AND id_servicio != ?');
    expect(selectS!.params).toEqual(['hab-1', 'serv-x']);
  });
});

describe('RoomManager.updateHostessServiceStatus', () => {
  it('retorna undefined si hostessIds está vacío', async () => {
    const { trx, calls } = makeTrx();

    await expect(RoomManager.updateHostessServiceStatus(trx, [])).resolves.toBeUndefined();
    expect(calls).toHaveLength(0);
  });

  it('pone estado_servicio=0 solo a quienes quedaron idle', async () => {
    const { trx, calls } = makeTrx([
      {
        match: /SELECT u\.id_usuario/,
        result: [{ id_usuario: 'anf-1' }, { id_usuario: 'anf-3' }]
      }
    ]);

    await RoomManager.updateHostessServiceStatus(trx, ['anf-1', 'anf-2', 'anf-3', 'anf-1']);

    const idleSelect = calls.find(c => /SELECT u\.id_usuario/.test(c.sql));
    expect(idleSelect!.sql).toContain('u.id_usuario IN (?,?,?)');
    expect(idleSelect!.params!.slice(0, 3)).toEqual(['anf-1', 'anf-2', 'anf-3']);

    const update = calls.find(c => /UPDATE usuarios SET estado_servicio = 0/.test(c.sql));
    expect(update).toBeDefined();
    expect(update!.params).toEqual(['anf-1', 'anf-3']);
  });

  it('no actualiza si nadie quedó idle', async () => {
    const { trx, calls } = makeTrx([{ match: /SELECT u\.id_usuario/, result: [] }]);

    await RoomManager.updateHostessServiceStatus(trx, ['anf-1']);

    expect(calls.some(c => /UPDATE usuarios SET estado_servicio = 0/.test(c.sql))).toBe(false);
  });

  it('incluye excludeServiceId/ excludeVentaId en la lógica idle', async () => {
    const { trx, calls } = makeTrx([
      { match: /SELECT u\.id_usuario/, result: [{ id_usuario: 'anf-1' }] }
    ]);

    await RoomManager.updateHostessServiceStatus(trx, ['anf-1'], 'serv-keep', 'venta-keep');

    const idleSelect = calls.find(c => /SELECT u\.id_usuario/.test(c.sql));
    expect(idleSelect!.sql).toContain('AND s.id_servicio != ?');
    expect(idleSelect!.sql).toContain('AND v.id_venta != ?');
    expect(idleSelect!.params).toEqual(['anf-1', 'serv-keep', 'venta-keep']);
  });

  it('usa getNowInBusinessTimezone de forma consistente en pause', async () => {
    const { trx, calls } = makeTrx([
      { match: /SELECT DISTINCT s\.id_servicio/, result: [{ id_servicio: 's1' }] },
      { match: /SELECT DISTINCT v\.id_venta/, result: [] }
    ]);

    await RoomManager.pauseConflictingServices(trx, ['anf-1']);

    expect(getNowInBusinessTimezone).toHaveBeenCalled();
    const update = calls.find(c => /UPDATE servicios SET estado = 3/.test(c.sql));
    expect(update!.params![0]).toBe('2026-01-15 12:00:00');
  });
});
