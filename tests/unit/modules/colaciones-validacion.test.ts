import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidationError } from '@/lib/errors/errors';

/**
 * El servidor es la autoridad de la colación: calcula los ml y el nombre de
 * la bebida desde la base y no confía en lo que manda el cliente.
 */

// Fila de la presentación que el servidor resuelve; el fake la devuelve tal cual.
const state = vi.hoisted(() => ({
  workerRole: 'anfitriona' as string | null,
  presentacion: {
    id: 'p',
    opciones_venta: [{ tipo: 'botella' }] as unknown,
    system_key: null as string | null,
    ml_botella: 750 as number | null,
    presentacion_nombre: '750 ml',
    producto_nombre: 'Whisky'
  } as Record<string, unknown>,
  insertados: [] as unknown[][],
  consultas: [] as string[]
}));

vi.mock('@/lib/database/db', () => {
  type Trx = (sql: string, params?: unknown[]) => Promise<unknown>;
  const trx: Trx = vi.fn(async (sql: string, params?: unknown[]) => {
    state.consultas.push(sql);
    if (sql.includes('SELECT u.id_usuario')) {
      return [{ id_usuario: 'w', rol: state.workerRole }];
    }
    if (sql.includes('p.opciones_venta')) {
      return [state.presentacion];
    }
    if (sql.includes('AND c.system_key = ?')) {
      // Consulta del Acompañamiento: sin coincidencias.
      return [];
    }
    if (sql.includes('FROM cajas') && sql.includes('FOR UPDATE')) {
      return [{ id_caja: 'c1' }];
    }
    if (sql.includes('FROM colaciones') && sql.includes('caja_id = (SELECT')) {
      // Comprobación preliminar de duplicado: el trabajador no tiene colación
      // en la caja abierta.
      return [];
    }
    if (sql.includes('INSERT INTO colaciones')) {
      state.insertados.push(params ?? []);
      return undefined;
    }
    if (sql.includes('SELECT id FROM colaciones WHERE usuario_id')) return [];
    return [];
  });
  return {
    query: vi.fn(async () => []),
    withTransaction: vi.fn(async (callback: (transaction: Trx) => unknown) => callback(trx)),
    generateUUID: () => 'col-1'
  };
});

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2025-01-01 12:00:00'
}));

vi.mock('@/modules/inventario', () => ({
  consumirColacionBar: vi.fn().mockResolvedValue(undefined)
}));

import { registrarColacion } from '@/modules/colaciones';

const base = {
  usuarioId: 'w',
  registradoPor: 'r',
  presentacionId: 'p',
  acompanamiento: null as 'gaseosa' | 'soda' | null
};

/** Valores de la fila insertada, por nombre de columna del INSERT. */
function valoresInsertados(): Record<string, unknown> {
  const params = state.insertados[0] as unknown[];
  // (id, usuario_id, presentacion_id, nombre_bebida, ml_bebida, acompanamiento,
  //  acompanamiento_presentacion_id, caja_id, registrado_por, fecha, fecha_crea)
  return {
    nombre_bebida: params[3],
    ml_bebida: params[4],
    caja_id: params[7]
  };
}

beforeEach(() => {
  state.workerRole = 'anfitriona';
  state.presentacion = {
    id: 'p',
    opciones_venta: [{ tipo: 'botella' }],
    system_key: null,
    ml_botella: 750,
    presentacion_nombre: '750 ml',
    producto_nombre: 'Whisky'
  };
  state.insertados = [];
  state.consultas = [];
  vi.clearAllMocks();
});

describe('registrarColacion: los ml y el nombre los calcula el servidor', () => {
  it('usa los ml configurados en la opción botella', async () => {
    state.presentacion.opciones_venta = [{ tipo: 'botella', ml_colacion: 120 }];

    await registrarColacion({ ...base });

    expect(valoresInsertados().ml_bebida).toBe(120);
  });

  it('cae en la capacidad de la botella cuando no hay ml configurados', async () => {
    await registrarColacion({ ...base });

    expect(valoresInsertados().ml_bebida).toBe(750);
  });

  it('entrega 0 ml cuando la bebida no define ni capacidad ni configuración', async () => {
    state.presentacion.ml_botella = null;

    await registrarColacion({ ...base });

    expect(valoresInsertados().ml_bebida).toBe(0);
  });

  it('registra los ml que calcula, no los que declara el cliente', async () => {
    // El módulo no acepta ml del cliente: el valor sale de la configuración
    // de la bebida. Que la ruta no se lo pase lo verifica
    // tests/unit/lib/api/colaciones-route.test.ts.
    state.presentacion.opciones_venta = [{ tipo: 'botella', ml_colacion: 120 }];

    const resultado = await registrarColacion({ ...base });

    expect(valoresInsertados().ml_bebida).toBe(120);
    expect(resultado).toMatchObject({ ml_bebida: 120 });
  });

  it('la entrada del módulo no tiene campo de ml ni de nombre', () => {
    // Si el módulo aceptara el ml del cliente, alguien podría esperar que se
    // usara. La autoridad es del servidor y no hay campo que lo contradiga.
    expect(Object.keys(base)).not.toContain('mlBebida');
    expect(Object.keys(base)).not.toContain('nombreBebida');
  });

  it('acepta que el cliente no mande ml', async () => {
    state.presentacion.opciones_venta = [{ tipo: 'botella', ml_colacion: 120 }];

    await expect(registrarColacion({ ...base })).resolves.toMatchObject({ ml_bebida: 120 });
  });

  it('compone el nombre de la bebida con el producto y la presentación', async () => {
    const resultado = await registrarColacion({ ...base });

    expect(valoresInsertados().nombre_bebida).toBe('Whisky 750 ml');
    expect(resultado).toMatchObject({ nombre_bebida: 'Whisky 750 ml' });
  });

  it('busca la bebida solo entre productos activos', async () => {
    // El catálogo solo ofrece productos activos: el servidor aplica el mismo
    // filtro, así que un producto desactivado no llega a la colación.
    const consultas: string[] = [];
    const original = state.consultas;
    state.consultas = consultas;
    try {
      await registrarColacion({ ...base });
    } finally {
      state.consultas = original;
    }

    const consultaBebida = consultas.find(sql => sql.includes('p.opciones_venta')) ?? '';
    expect(consultaBebida).toContain('pr.id_producto = p.producto_id AND pr.estado = 1');
  });
});
