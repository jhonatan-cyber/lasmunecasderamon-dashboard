// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Registro de entradas — unidad que mueve dinero, stock y caja.
 *
 * Se mockean las fronteras (configuración, inventario, caja, transacción y
 * efectos) y se fija el comportamiento del módulo: precio, reparto por entrada,
 * `fecha_crea` del servidor y el invariante de cobro (caja o venta, nunca ambas).
 */

const db = vi.hoisted(() => ({ query: vi.fn(), secuencia: 0 }));
const estado = vi.hoisted(() => ({
  precioVenta: 10000,
  inserts: [] as Array<{ sql: string; params: unknown[] }>
}));
const trx = vi.hoisted(() => vi.fn());

vi.mock('@/lib/database/db', () => ({
  query: db.query,
  generateUUID: () => `id-${++db.secuencia}`
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-10-19 12:00:00'
}));

vi.mock('@/modules/inventario', () => ({
  consumirProductoCortesiaBar: vi.fn()
}));

vi.mock('@/modules/caja', () => ({
  registrarMovimientoCobro: vi.fn()
}));

vi.mock('@/lib/transaccion/contrato', () => ({
  enUnaUnidad: async (operacion: (unidad: unknown) => Promise<unknown>) =>
    operacion({
      id: 'unidad-1',
      abierta: true,
      ejecutar: (fn: (contexto: unknown) => unknown) => fn({ id: 'unidad-1' })
    })
}));

vi.mock('@/lib/transaccion/infraestructura', () => ({
  resolverTransaccion: () => trx
}));

vi.mock('@/lib/transaccion/efectos', () => ({
  ejecutarEfectosConfirmados: vi.fn(async (tareas: Array<() => unknown>) => {
    for (const tarea of tareas) await tarea();
  })
}));

import { registrarEntrada } from '@/modules/entradas';
import { consumirProductoCortesiaBar } from '@/modules/inventario';
import { registrarMovimientoCobro } from '@/modules/caja';
import { ejecutarEfectosConfirmados } from '@/lib/transaccion/efectos';

type PlanVenta = {
  totalVenta: number;
  metodoPago: string;
  usuarioId: string;
  entradaId: string;
  detalles: unknown[];
};

const entradaBase = {
  montoEntrada: 10000,
  metodoPago: 'efectivo' as const,
  fecha: '2026-10-19',
  hora: '20:30',
  registradoPor: 'user-1',
  partes: [{ montoBebidaAdicional: 0 }],
  productosCortesia: [{ presentacionId: 'prod-1', cantidad: 1 }]
};

beforeEach(() => {
  vi.clearAllMocks();
  db.secuencia = 0;
  estado.precioVenta = 10000;
  estado.inserts = [];
  db.query.mockResolvedValue([{ valor: '10000' }]);
  trx.mockImplementation(async (sql: string, params: unknown[] = []) => {
    if (sql.includes('FROM cajas WHERE estado = 1')) return [{ id_caja: 'caja-1' }];
    if (
      sql.includes('INSERT INTO entradas_clientes') &&
      !sql.includes('entradas_clientes_productos')
    ) {
      estado.inserts.push({ sql, params });
      return [];
    }
    if (sql.includes('INSERT INTO entradas_clientes_productos')) return [];
    if (sql.includes('SELECT precio_venta FROM inventario_presentaciones'))
      return [{ precio_venta: estado.precioVenta }];
    if (sql.includes('SELECT producto_id, precio_venta, opciones_venta'))
      return [{ producto_id: 'producto-1', precio_venta: estado.precioVenta, opciones_venta: [] }];
    return [];
  });
});

describe('precio de la entrada', () => {
  it('rechaza un total distinto de costo_entrada × entradas sin abrir la unidad', async () => {
    await expect(registrarEntrada({ ...entradaBase, montoEntrada: 9000 })).rejects.toThrow(
      /precio de la entrada no coincide/
    );

    expect(trx).not.toHaveBeenCalled();
  });

  it('acepta el total del grupo y guarda una fila por entrada', async () => {
    const resultado = await registrarEntrada({
      ...entradaBase,
      montoEntrada: 20000,
      partes: [{ montoBebidaAdicional: 0 }, { montoBebidaAdicional: 0 }],
      productosCortesia: [
        { presentacionId: 'prod-1', cantidad: 1 },
        { presentacionId: 'prod-2', cantidad: 1 }
      ]
    });

    expect(resultado.ids).toHaveLength(2);
    expect(estado.inserts).toHaveLength(2);
    expect(estado.inserts.map(fila => fila.params[3])).toEqual([10000, 10000]);
  });

  it('usa el default del registro cuando la clave no está guardada', async () => {
    db.query.mockResolvedValue([]);

    await expect(registrarEntrada({ ...entradaBase, montoEntrada: 1 })).rejects.toThrow(
      /son 10000 por persona/
    );
  });

  it('rechaza un costo configurado no positivo', async () => {
    db.query.mockResolvedValue([{ valor: '0' }]);

    await expect(registrarEntrada(entradaBase)).rejects.toThrow(/no está configurado/);
  });
});

describe('fecha de creación', () => {
  it('no envía fecha_crea: la pone el servidor con DEFAULT CURRENT_TIMESTAMP', async () => {
    await registrarEntrada(entradaBase);

    const [fila] = estado.inserts;
    expect(fila.sql).not.toContain('fecha_crea');
    expect(fila.params).toHaveLength(12);
  });
});

describe('invariante de cobro', () => {
  it('sin adicional cobra la entrada en caja y no abre venta', async () => {
    const onVenta = vi.fn();

    await registrarEntrada(entradaBase, onVenta);

    expect(onVenta).not.toHaveBeenCalled();
    expect(registrarMovimientoCobro).toHaveBeenCalledWith(
      'caja-1',
      { efectivo: 10000, tarjeta: 0, transferencia: 0 },
      { id: 'unidad-1' }
    );
  });

  it('con adicional registra la venta y no mueve la caja por la entrada', async () => {
    estado.precioVenta = 15000;
    const onVenta = vi.fn(
      async (_plan: PlanVenta, _contexto: unknown, _asignarTarea: unknown) => undefined
    );

    const resultado = await registrarEntrada(
      {
        ...entradaBase,
        partes: [{ montoBebidaAdicional: 5000, bebidaCortesiaPresentacionId: 'prod-1' }]
      },
      onVenta
    );

    expect(registrarMovimientoCobro).not.toHaveBeenCalled();
    expect(onVenta).toHaveBeenCalledTimes(1);
    const [plan] = onVenta.mock.calls[0];
    expect(plan).toMatchObject({
      totalVenta: 15000,
      metodoPago: 'efectivo',
      usuarioId: 'user-1',
      entradaId: resultado.ids[0]
    });
    expect(plan.detalles).toHaveLength(1);
    expect(ejecutarEfectosConfirmados).toHaveBeenCalledTimes(1);
  });
});

describe('cortesía sin adicional', () => {
  it('consume el producto con el precio de una entrada', async () => {
    await registrarEntrada(entradaBase);

    expect(consumirProductoCortesiaBar).toHaveBeenCalledWith(
      'prod-1',
      'user-1',
      '2026-10-19 20:30:00',
      { id: 'unidad-1' },
      10000,
      null
    );
  });
});
