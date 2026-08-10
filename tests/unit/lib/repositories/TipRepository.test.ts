import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryHarness = vi.hoisted(() => {
  const queryMock = vi.fn();
  let uuidCounter = 0;
  return {
    queryMock,
    generateUUID: () => `uuid-${++uuidCounter}`,
    resetUuid: () => {
      uuidCounter = 0;
    }
  };
});

vi.mock('@/lib/database/db', () => ({
  generateUUID: repositoryHarness.generateUUID,
  withTransaction: vi.fn(async (fn: any) => fn(repositoryHarness.queryMock)),
  query: repositoryHarness.queryMock
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-04-11 12:00:00'
}));

vi.mock('@/lib/repositories/BaseRepository', () => {
  const mockInsert = vi.fn(async () => undefined);
  return { BaseRepository: { insert: mockInsert } };
});

import { TipRepository } from '@/lib/repositories/TipRepository';
import { BaseRepository } from '@/lib/repositories/BaseRepository';

const ACTIVE_LOCAL_STAFF = [
  { id_usuario: 'cajero-1' },
  { id_usuario: 'garzon-1' },
  { id_usuario: 'garzon-2' }
];

function mockStaff(rows: any[] = ACTIVE_LOCAL_STAFF) {
  repositoryHarness.queryMock.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM logins l')) return rows;
    return [];
  });
}

// El detalle ahora se inserta como batch INSERT multi-row vía trx (queryMock).
// Columnas: id_detalle_propina, propina_id, usuario_id, monto, fecha_mod, estado, fecha_crea
function getDetalleBatch(): { usuarioIds: string[]; montos: number[]; propinaIds: string[] } {
  const call = repositoryHarness.queryMock.mock.calls.find(([sql]) =>
    String(sql).includes('INSERT INTO detalle_propinas')
  );
  if (!call) return { usuarioIds: [], montos: [], propinaIds: [] };
  const values = call[1] as any[];
  const COLS = 7;
  const usuarioIds: string[] = [];
  const montos: number[] = [];
  const propinaIds: string[] = [];
  for (let i = 0; i < values.length; i += COLS) {
    propinaIds.push(values[i + 1]);
    usuarioIds.push(values[i + 2]);
    montos.push(values[i + 3]);
  }
  return { usuarioIds, montos, propinaIds };
}

beforeEach(() => {
  vi.clearAllMocks();
  repositoryHarness.resetUuid();
});

describe('TipRepository.register', () => {
  it('reparte la propina entre todos los cajeros/garzones activos del local, sin importar quien realizo la venta', async () => {
    mockStaff();

    const result = await TipRepository.register({ venta_id: 'venta-1', monto: 10000 });

    // La consulta de distribucion apunta a logins activos y presentes en el local
    const distSql = repositoryHarness.queryMock.mock.calls.find(([sql]) =>
      String(sql).includes('FROM logins l')
    )?.[0] as string;
    expect(distSql).toBeDefined();
    expect(distSql).toContain('l.estado = 1');
    expect(distSql).toContain('l.en_local = 1');
    expect(distSql).toContain('u.estado = 1');
    expect(distSql).toContain("'cajero', 'garzon'");
    // Reparto global del local: no debe filtrar por usuarios
    expect(distSql).not.toContain('u.id_usuario IN');

    const insertCalls = vi.mocked(BaseRepository.insert).mock.calls;

    // Un unico registro en propinas con el monto total
    const propinaCalls = insertCalls.filter(c => c[1] === 'propinas');
    expect(propinaCalls).toHaveLength(1);
    expect(propinaCalls[0][2]).toEqual(
      expect.objectContaining({
        id_propina: 'uuid-1',
        venta_id: 'venta-1',
        propina: 10000,
        estado: 1,
        fecha_crea: '2026-04-11 12:00:00'
      })
    );

    // Batch insert: un detalle por cada cajero/garzon activo del local
    const batch = getDetalleBatch();
    expect(batch.usuarioIds).toEqual(['cajero-1', 'garzon-1', 'garzon-2']);
    expect(batch.montos).toEqual([3334, 3333, 3333]);
    expect(batch.propinaIds).toEqual(['uuid-1', 'uuid-1', 'uuid-1']);

    expect(result).toEqual({
      id: 'uuid-1',
      montoPorUsuario: 3333,
      count: 3,
      usuarios_distribucion: 3
    });
  });

  it('si se reciben usuario_ids explicitos, distribuye solo entre esos usuarios', async () => {
    repositoryHarness.queryMock.mockImplementation(async (sql: string, params: any[]) => {
      if (sql.includes('FROM usuarios u') && sql.includes('u.id_usuario IN')) {
        return (params as string[]).map(id => ({ id_usuario: id }));
      }
      return [];
    });

    const result = await TipRepository.register({
      venta_id: 'venta-u',
      monto: 6000,
      usuario_ids: ['cajero-1', 'garzon-1']
    });

    const distSql = repositoryHarness.queryMock.mock.calls.find(([sql]) =>
      String(sql).includes('u.id_usuario IN')
    )?.[0] as string;
    expect(distSql).toBeDefined();
    expect(distSql).toContain('FROM usuarios u');
    expect(distSql).not.toContain('FROM logins l');

    const batch = getDetalleBatch();
    expect(batch.usuarioIds).toEqual(['cajero-1', 'garzon-1']);
    expect(batch.montos).toEqual([3000, 3000]);
    expect(result).toEqual({
      id: 'uuid-1',
      montoPorUsuario: 3000,
      count: 2,
      usuarios_distribucion: 2
    });
  });

  it('registra la propina sin distribuir cuando no hay cajeros/garzones activos en el local', async () => {
    mockStaff([]);

    const result = await TipRepository.register({ venta_id: 'venta-2', monto: 5000 });

    const insertCalls = vi.mocked(BaseRepository.insert).mock.calls;
    expect(insertCalls.filter(c => c[1] === 'propinas')).toHaveLength(1);
    expect(insertCalls.filter(c => c[1] === 'detalle_propinas')).toHaveLength(0);

    expect(result).toEqual({
      id: 'uuid-1',
      mensaje: 'Propina registrada sin distribución (sin usuarios activos)'
    });
  });
});

describe('TipRepository.register — reparto exacto', () => {
  function getMontosDetalles(): number[] {
    return getDetalleBatch().montos;
  }

  it('reparte montos redondeados (enteros) cuya suma coincide con el total', async () => {
    mockStaff();

    await TipRepository.register({ venta_id: 'venta-r1', monto: 10000 });

    const montos = getMontosDetalles();
    expect(montos).toHaveLength(3);
    montos.forEach(m => expect(Number.isInteger(m)).toBe(true));
    expect(montos).toEqual([3334, 3333, 3333]);
    expect(montos.reduce((sum, m) => sum + m, 0)).toBe(10000);
  });

  it('reparte sin resto cuando el monto divide exacto', async () => {
    mockStaff();

    await TipRepository.register({ venta_id: 'venta-r2', monto: 9000 });

    const montos = getMontosDetalles();
    expect(montos).toEqual([3000, 3000, 3000]);
    expect(montos.reduce((sum, m) => sum + m, 0)).toBe(9000);
  });

  it('reparte un monto impar (5000 entre 3) repartiendo el resto de a 1 y sumando exacto', async () => {
    mockStaff();

    await TipRepository.register({ venta_id: 'venta-r3', monto: 5000 });

    const montos = getMontosDetalles();
    // floor(5000/3) = 1666, resto = 2 → los 2 primeros reciben +1
    expect(montos).toEqual([1667, 1667, 1666]);

    const suma = montos.reduce((sum, m) => sum + m, 0);
    expect(suma).toBe(5000);
    expect(suma).toBe(
      vi.mocked(BaseRepository.insert).mock.calls.find(c => c[1] === 'propinas')?.[2]
        .propina as number
    );
  });

  it('la suma de los detalles coincide SIEMPRE con el monto total de la propina (invariante)', async () => {
    // PRNG determinista (LCG) para que el test sea reproducible
    let seed = 12345;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const casos: Array<{ monto: number; usuarios: number }> = [
      { monto: 1, usuarios: 3 },
      { monto: 2, usuarios: 3 },
      { monto: 9999, usuarios: 2 },
      { monto: 10001, usuarios: 3 },
      { monto: 123456, usuarios: 5 }
    ];

    // Casos fijos + 100 combinaciones aleatorias
    for (let i = 0; i < 100; i++) {
      casos.push({
        monto: 1 + Math.floor(rand() * 1000000),
        usuarios: 1 + Math.floor(rand() * 10)
      });
    }

    for (const caso of casos) {
      mockStaff(Array.from({ length: caso.usuarios }, (_, i) => ({ id_usuario: `u${i + 1}` })));

      await TipRepository.register({ venta_id: 'venta-x', monto: caso.monto });

      const montos = getMontosDetalles();
      const montoGuardado = vi
        .mocked(BaseRepository.insert)
        .mock.calls.find(c => c[1] === 'propinas')?.[2].propina as number;

      // Un detalle por cada cajero/garzon activo
      expect(montos).toHaveLength(caso.usuarios);
      // Montos enteros y no negativos (reparto redondeado)
      montos.forEach(m => {
        expect(Number.isInteger(m)).toBe(true);
        expect(m).toBeGreaterThanOrEqual(0);
      });
      // Invariante: la suma de lo repartido coincide con el total de la propina
      const suma = montos.reduce((sum, m) => sum + m, 0);
      expect(suma).toBe(caso.monto);
      expect(montoGuardado).toBe(caso.monto);
      expect(suma).toBe(montoGuardado);

      vi.mocked(BaseRepository.insert).mockClear();
      repositoryHarness.queryMock.mockClear();
    }
  });
});

describe('TipRepository.getSummary', () => {
  function mockSummary(rows: any[]) {
    repositoryHarness.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id_caja FROM cajas')) return [{ id_caja: 'caja-9' }];
      if (sql.includes('FROM propinas P')) return rows;
      return [];
    });
  }

  it('para admin devuelve el resumen global sin filtrar por usuario', async () => {
    const rows = [{ id_usuario: 'u1', total_propinas: 500 }];
    mockSummary(rows);

    const result = await TipRepository.getSummary(true, 'ignored', false);
    expect(result).toEqual(rows);

    const call = repositoryHarness.queryMock.mock.calls.find(([sql]) =>
      String(sql).includes('FROM propinas P')
    );
    expect(String(call?.[0])).not.toContain('WHERE DP.usuario_id');
    expect(call?.[1]).toEqual([]);
  });

  it('para no-admin filtra el resumen por el usuario', async () => {
    const rows = [{ id_usuario: 'user-1', total_propinas: 300 }];
    mockSummary(rows);

    const result = await TipRepository.getSummary(false, 'user-1', false);
    expect(result).toEqual(rows);

    const call = repositoryHarness.queryMock.mock.calls.find(([sql]) =>
      String(sql).includes('FROM propinas P')
    );
    expect(String(call?.[0])).toContain('WHERE DP.usuario_id = ?');
    expect(call?.[1]).toEqual(['user-1']);
  });

  it('con caja activa agrega el filtro por caja y devuelve el resumen', async () => {
    const rows = [{ id_usuario: 'u1', total_propinas: 100 }];
    mockSummary(rows);

    const result = await TipRepository.getSummary(true, 'ignored', true);
    expect(result).toEqual(rows);

    const call = repositoryHarness.queryMock.mock.calls.find(([sql]) =>
      String(sql).includes('FROM propinas P')
    );
    expect(String(call?.[0])).toContain('(V.caja_id = ? OR V.id_venta IS NULL)');
    expect(call?.[1]).toEqual(['caja-9']);
  });

  it('con caja activa pero sin caja abierta devuelve lista vacia', async () => {
    repositoryHarness.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id_caja FROM cajas')) return [];
      return [];
    });

    const result = await TipRepository.getSummary(true, 'ignored', true);
    expect(result).toEqual([]);
  });
});

describe('TipRepository.getByUser', () => {
  it('devuelve las propinas del usuario filtrando por DP.usuario_id', async () => {
    const rows = [{ propina_id: 'tip-1', monto: 500 }];
    repositoryHarness.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM propinas P')) return rows;
      return [];
    });

    const result = await TipRepository.getByUser('user-1');
    expect(result).toEqual(rows);

    const call = repositoryHarness.queryMock.mock.calls.find(([sql]) =>
      String(sql).includes('FROM propinas P')
    );
    expect(String(call?.[0])).toContain('WHERE DP.usuario_id = ?');
    expect(call?.[1]).toEqual(['user-1']);
  });
});

describe('TipRepository.getDetails', () => {
  function mockDetails(rows: any[]) {
    repositoryHarness.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM propinas p')) return rows;
      return [];
    });
  }

  it('devuelve los detalles del usuario filtrando por usuario sin rango de fechas', async () => {
    const rows = [{ propina_id: 'tip-1', monto: 500, estado: 1 }];
    mockDetails(rows);

    const result = await TipRepository.getDetails('user-1');
    expect(result).toEqual(rows);

    const call = repositoryHarness.queryMock.mock.calls.find(([sql]) =>
      String(sql).includes('FROM propinas p')
    );
    expect(String(call?.[0])).toContain('WHERE dp.usuario_id = ?');
    expect(String(call?.[0])).toContain('ORDER BY p.fecha_crea DESC');
    expect(String(call?.[0])).not.toContain('BETWEEN');
    expect(call?.[1]).toEqual(['user-1']);
  });

  it('agrega el filtro de rango de fechas cuando se pasan startDate y endDate', async () => {
    const rows = [{ propina_id: 'tip-1', monto: 500 }];
    mockDetails(rows);

    const result = await TipRepository.getDetails('user-1', '2026-01-01', '2026-01-31');
    expect(result).toEqual(rows);

    const call = repositoryHarness.queryMock.mock.calls.find(([sql]) =>
      String(sql).includes('FROM propinas p')
    );
    expect(String(call?.[0])).toContain('DATE(p.fecha_crea) BETWEEN ? AND ?');
    expect(call?.[1]).toEqual(['user-1', '2026-01-01', '2026-01-31']);
  });
});

describe('TipRepository.getByIdWithParticipants', () => {
  it('devuelve null si la propina no existe', async () => {
    repositoryHarness.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM propinas WHERE id_propina = ?')) return [];
      return [];
    });

    const result = await TipRepository.getByIdWithParticipants('no-existe');
    expect(result).toBeNull();
  });

  it('devuelve la propina con sus participantes y el conteo', async () => {
    const tipRow = [
      {
        id_propina: 'tip-1',
        venta_id: 'venta-1',
        monto_total: 5000,
        fecha_crea: '2026-01-01'
      }
    ];
    const participantes = [
      { id_usuario: 'u1', nick: 'ana', nombre: 'Ana', monto: 2500, estado: 1 },
      { id_usuario: 'u2', nick: 'luis', nombre: 'Luis', monto: 2500, estado: 1 }
    ];
    repositoryHarness.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM propinas WHERE id_propina = ?')) return tipRow;
      if (sql.includes('FROM detalle_propinas DP')) return participantes;
      return [];
    });

    const result = await TipRepository.getByIdWithParticipants('tip-1');
    expect(result).toEqual({
      ...tipRow[0],
      conteo_usuarios: 2,
      participantes
    });

    const queries = repositoryHarness.queryMock.mock.calls.map(([sql]) => String(sql));
    const tipQuery = queries.find(q => q.includes('FROM propinas WHERE id_propina = ?'));
    const participantesQuery = queries.find(q => q.includes('FROM detalle_propinas DP'));
    expect(tipQuery).toBeDefined();
    expect(participantesQuery).toBeDefined();
  });
});
