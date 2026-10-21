import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regla de negocio: la colación es gratuita para el trabajador.
 *
 * El registro guarda la bebida y descuenta stock del bar, pero no puede generar
 * un ingreso en la caja ni devolver un monto. La tabla `colaciones` ya no tiene
 * columnas de precio ni de método de pago (migración 096), así que el test
 * vigila que la unidad de trabajo no escriba en las tablas de dinero.
 */

const estado = vi.hoisted(() => ({
  consultas: [] as { sql: string; params: unknown[] }[],
  colacionInsertada: false,
  botella: { tipo: 'botella', acompanamiento: { unidades: 0 } } as Record<string, unknown>
}));

vi.mock('@/lib/database/db', () => {
  type Trx = (sql: string, params?: unknown[]) => Promise<unknown>;
  const trx: Trx = vi.fn(async (sql: string, params: unknown[] = []) => {
    estado.consultas.push({ sql, params });
    if (sql.includes('SELECT u.id_usuario')) return [{ id_usuario: 'w', rol: 'anfitriona' }];
    if (sql.includes('p.opciones_venta'))
      return [
        {
          id: 'p',
          opciones_venta: [estado.botella],
          system_key: 'licores',
          ml_botella: 150,
          presentacion_nombre: '750 ml',
          producto_nombre: 'Whisky'
        }
      ];
    // Acompañamiento: bebida analcohólica con stock en el bar.
    if (sql.includes('c.system_key = ?')) return [{ id: 'mixer-1' }];
    if (sql.includes('FROM cajas') && sql.includes('FOR UPDATE')) return [{ id_caja: 'c1' }];
    // Comprobación preliminar de duplicado: sin colación previa en la caja abierta.
    if (sql.includes('FROM colaciones') && sql.includes('caja_id = (SELECT')) return [];
    if (sql.includes('SELECT id FROM colaciones WHERE usuario_id')) return [];
    if (sql.includes('INSERT INTO colaciones')) {
      estado.colacionInsertada = true;
      return undefined;
    }
    return [];
  });
  return {
    query: vi.fn(),
    withTransaction: vi.fn(async (callback: (transaction: Trx) => unknown) => callback(trx)),
    generateUUID: () => 'col-1'
  };
});

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2025-01-01 12:00:00'
}));

const consumirColacionBar = vi.hoisted(() => vi.fn());

vi.mock('@/modules/inventario', () => ({ consumirColacionBar }));

import { query } from '@/lib/database/db';
import { listarColaciones, registrarColacion } from '@/modules/colaciones';

const botellaSinAcompanamiento = {
  tipo: 'botella',
  acompanamiento: { unidades: 0 }
};

const botellaConAcompanamiento = {
  tipo: 'botella',
  acompanamiento: { unidades: 0 },
  acompanamiento_colacion: { unidades: 1, ml: 150 }
};

/**
 * Reconstruye la fila que inserta el `INSERT INTO colaciones` juntando la lista
 * de columnas con los valores literales y los parámetros, sin depender del orden
 * exacto de las columnas.
 */
function filaInsertada(sql: string, params: unknown[]): Record<string, unknown> {
  const columnas = sql
    .slice(sql.indexOf('(') + 1, sql.indexOf(')'))
    .split(',')
    .map(columna => columna.trim());
  const valoresSql = sql.slice(sql.indexOf('VALUES') + 'VALUES'.length);
  const valores = valoresSql
    .slice(valoresSql.indexOf('(') + 1, valoresSql.indexOf(')'))
    .split(',')
    .map(valor => valor.trim());

  let parametro = 0;
  return Object.fromEntries(
    columnas.map((columna, indice) => {
      const valor = valores[indice];
      return [columna, valor === '?' ? params[parametro++] : valor.replace(/^'|'$/g, '')];
    })
  );
}

/** Escrituras sobre las tablas que componen el dinero del turno. */
const escriturasDeDinero =
  /(insert into|update|delete from)\s+(movimientos_caja|ventas|detalle_ventas|cajas|anticipos|comisiones)\b/i;

const input = {
  usuarioId: 'w',
  registradoPor: 'r',
  presentacionId: 'p',
  acompanamiento: null
};

beforeEach(() => {
  estado.consultas = [];
  estado.colacionInsertada = false;
  estado.botella = botellaSinAcompanamiento;
  vi.clearAllMocks();
});

describe('registrarColacion no genera ingreso en la caja', () => {
  it('guarda la colación sin columnas de precio ni de pago', async () => {
    const resultado = await registrarColacion(input);

    expect(estado.colacionInsertada).toBe(true);
    expect(resultado).toEqual({
      id: 'col-1',
      caja_id: 'c1',
      fecha: '2025-01-01',
      ml_bebida: 150,
      nombre_bebida: 'Whisky 750 ml'
    });
    // La respuesta no tiene monto: no hay nada que cobrar.
    expect(Object.keys(resultado).sort()).toEqual([
      'caja_id',
      'fecha',
      'id',
      'ml_bebida',
      'nombre_bebida'
    ]);

    const insert = estado.consultas.find(consulta =>
      consulta.sql.includes('INSERT INTO colaciones')
    );
    if (!insert) throw new Error('No se ejecutó el INSERT de la colación');
    const fila = filaInsertada(insert.sql, insert.params);
    // La tabla ya no tiene columnas de precio ni de método de pago (migración
    // 096): la garantía de que la colación es gratuita está en el esquema.
    expect(fila.precio).toBeUndefined();
    expect(fila.metodo_pago).toBeUndefined();
    expect(fila.cantidad).toBeUndefined();
    expect(fila.usuario_id).toBe('w');

    expect(estado.consultas.filter(consulta => escriturasDeDinero.test(consulta.sql))).toEqual([]);
  });

  it('descuenta el stock del bar sin transportar precio', async () => {
    await registrarColacion(input);

    expect(consumirColacionBar).toHaveBeenCalledTimes(1);
    const [detalles, usuarioId, fechaHora] = consumirColacionBar.mock.calls[0];
    expect(detalles).toEqual([{ presentacion_id: 'p', ml: 150 }]);
    expect(usuarioId).toBe('r');
    expect(fechaHora).toBe('2025-01-01 12:00:00');
    expect(JSON.stringify(detalles)).not.toMatch(/precio|monto|comision/i);
  });

  it('tampoco cobra cuando la colación incluye acompañamiento', async () => {
    estado.botella = botellaConAcompanamiento;

    await registrarColacion({
      ...input,
      acompanamiento: 'gaseosa',
      acompanamientoPresentacionId: 'mixer-1'
    });

    const insert = estado.consultas.find(consulta =>
      consulta.sql.includes('INSERT INTO colaciones')
    );
    if (!insert) throw new Error('No se ejecutó el INSERT de la colación');
    expect(filaInsertada(insert.sql, insert.params).precio).toBeUndefined();
    expect(estado.consultas.filter(consulta => escriturasDeDinero.test(consulta.sql))).toEqual([]);

    // Bebida y acompañamiento salen del bar con sus ml; ninguno lleva importe.
    const [detalles] = consumirColacionBar.mock.calls[0];
    expect(detalles).toEqual([
      { presentacion_id: 'p', ml: 150 },
      { presentacion_id: 'mixer-1', ml: 150 }
    ]);
  });

  it('el detalle del turno no expone precio ni método de pago', async () => {
    vi.mocked(query).mockResolvedValueOnce([] as never);

    await listarColaciones('2025-01-01', 'c1');

    const [sql] = vi.mocked(query).mock.calls[0];
    expect(sql).not.toMatch(/\bprecio\b/i);
    expect(sql).not.toMatch(/metodo_pago/i);
  });
});
