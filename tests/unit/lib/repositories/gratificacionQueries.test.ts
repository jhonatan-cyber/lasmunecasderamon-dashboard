// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock('@/lib/database/db', () => ({
  query: db.query,
  generateUUID: () => 'generated-uuid',
  withTransaction: vi.fn()
}));
vi.mock('@/lib/business/timezoneService', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/business/timezoneService')>();
  return { ...actual, getNowInBusinessTimezone: () => '2026-09-27 12:00:00' };
});
vi.mock('@/modules/comunicaciones/whatsapp/adaptador', () => ({ enviarWhatsApp: vi.fn() }));
vi.mock('@/lib/api/sseService', () => ({ sendNotificationToAll: vi.fn() }));
vi.mock('@/modules/comunicaciones/push/servicio', () => ({
  sendPushByRole: vi.fn(),
  sendPushNotification: vi.fn()
}));
vi.mock('@/lib/business/whatsappConfig', () => ({ getAdminWhatsApp: vi.fn() }));
vi.mock('@/lib/utils/logger', () => {
  const mocks = {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    captureException: vi.fn()
  };
  return { logger: mocks, default: mocks };
});

import {
  createGratificacion,
  getAllGratificaciones
} from '@/modules/personal/gratificaciones/consultas';

/** El SELECT con el que trabaja el filtro (la primera query es el chequeo de tabla). */
const lastSelect = (): [string, any[]] => {
  const calls = db.query.mock.calls.filter(([sql]) => /FROM gratificaciones G/.test(String(sql)));
  const last = calls[calls.length - 1];
  return [String(last[0]), last[1]];
};

/** Fila cruda que devuelve el mock del SELECT del GET. */
const rawRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'g1',
  usuario_id: 'sebas-1',
  solicitante_id: 'pepe-1',
  id_usuario: 'sebas-1',
  usuario: 'Sebas Trabajador',
  solicitante: 'Pepe Cajero',
  monto: 500,
  estado: 1,
  fecha_crea_fmt: '2026-09-27 12:00:00',
  fecha_mod_fmt: null,
  ...overrides
});

const mockSelectRows = (rows: unknown[]) => {
  db.query.mockImplementation(async (sql: string) => {
    if (/information_schema/.test(sql)) return [{ table_name: 'gratificaciones' }];
    if (/FROM gratificaciones G/.test(sql)) return rows;
    return [];
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  db.query.mockImplementation(async (sql: string) => {
    if (/information_schema/.test(sql)) return [{ table_name: 'gratificaciones' }];
    return [];
  });
});

/**
 * El SQL del GET es la mitad del contrato que los tests del handler no ven (allí
 * el servicio está mockeado): si la unión beneficiario/solicitante se rompe, el
 * cajero vuelve a ver el listado completo —o deja de ver sus solicitudes— sin
 * que ningún otro test se entere.
 */
describe('getAllGratificaciones · filtros del GET', () => {
  it('sin criterios devuelve el listado completo (administrador)', async () => {
    await getAllGratificaciones();

    const [sql, params] = lastSelect();
    expect(sql).not.toContain('WHERE');
    expect(params).toEqual([]);
  });

  it('solo beneficiario: es lo que pide el administrador con ?userId', async () => {
    await getAllGratificaciones('otro-usuario');

    const [sql, params] = lastSelect();
    expect(sql).toContain('WHERE G.usuario_id = ?');
    expect(params).toEqual(['otro-usuario']);
  });

  it('la unión beneficiario/solicitante es lo que recibe el cajero', async () => {
    await getAllGratificaciones('pepe-1', 'pepe-1');

    const [sql, params] = lastSelect();
    expect(sql).toContain('WHERE (G.usuario_id = ? OR G.solicitante_id = ?)');
    expect(params).toEqual(['pepe-1', 'pepe-1']);
  });

  it('solo solicitante (caso de la unión con un criterio)', async () => {
    await getAllGratificaciones(undefined, 'pepe-1');

    const [sql, params] = lastSelect();
    expect(sql).toContain('WHERE G.solicitante_id = ?');
    expect(params).toEqual(['pepe-1']);
  });
  it('el GET resuelve el nombre del solicitante con un LEFT JOIN', async () => {
    await getAllGratificaciones('pepe-1', 'pepe-1');

    const [sql] = lastSelect();
    expect(sql).toContain('AS solicitante');
    expect(sql).toContain('LEFT JOIN usuarios S ON S.id_usuario = G.solicitante_id');
  });

  it('expone solicitante_id en cada fila', async () => {
    mockSelectRows([rawRow()]);

    const rows = await getAllGratificaciones('pepe-1', 'pepe-1');

    expect(rows).toHaveLength(1);
    expect(rows[0].solicitante_id).toBe('pepe-1');
    expect(rows[0].usuario).toBe('Sebas Trabajador');
  });

  it('expone el nombre del solicitante resuelto', async () => {
    mockSelectRows([rawRow()]);

    const rows = await getAllGratificaciones('pepe-1', 'pepe-1');

    expect(rows[0].solicitante).toBe('Pepe Cajero');
  });

  it('fila sin nombre resuelto (legacy o borrado) cae a null, nunca "undefined"', async () => {
    mockSelectRows([rawRow({ solicitante: null })]);

    const rows = await getAllGratificaciones();

    expect(rows[0].solicitante).toBeNull();
  });
});

describe('createGratificacion · persiste solicitante_id (migración 037)', () => {
  it('incluye la columna en el INSERT con el valor recibido', async () => {
    await createGratificacion({
      usuario_id: 'sebas-1',
      monto: 123,
      descripcion: 'x',
      solicitante_id: 'pepe-1'
    });

    const insert = db.query.mock.calls.find(([sql]) =>
      /INSERT INTO gratificaciones/.test(String(sql))
    );
    expect(insert, 'no hubo INSERT INTO gratificaciones').toBeDefined();
    const [sql, params] = insert!;
    expect(sql).toContain('solicitante_id');
    expect(params).toContain('pepe-1');
  });

  it('sin solicitante escribe null (la columna es nullable)', async () => {
    await createGratificacion({ usuario_id: 'sebas-1', monto: 123 });

    const insert = db.query.mock.calls.find(([sql]) =>
      /INSERT INTO gratificaciones/.test(String(sql))
    );
    expect(insert![1]).toContain(null);
  });
});
