// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const estado = vi.hoisted(() => ({
  entradas: [] as Array<{
    id: string;
    grupo_registro_id: string;
    monto_entrada: number;
    metodo_pago: string;
    cover_estado: string;
  }>,
  presentaciones: [] as Array<{
    id: string;
    producto_id: string;
    precio_venta: number;
    opciones_venta: unknown[];
    estado: number;
  }>,
  solicitud: 'pendiente',
  caja: true,
  commits: 0,
  rollbacks: 0,
  writes: [] as Array<{ sql: string; params: unknown[] }>
}));
const trx = vi.hoisted(() => vi.fn());
const db = vi.hoisted(() => vi.fn());
vi.mock('@/lib/database/db', () => ({ query: db, generateUUID: () => 'id-test' }));
vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-11-12 12:00:00'
}));
vi.mock('@/modules/inventario', () => ({
  consumirProductoCoverBar: vi.fn(),
  consumirCorteCoverBar: vi.fn()
}));
vi.mock('@/modules/caja', () => ({ registrarMovimientoCobro: vi.fn() }));
vi.mock('@/lib/transaction/contract', () => ({
  enUnaUnidad: vi.fn(async (operacion: (unidad: { id: string }) => Promise<unknown>) => {
    try {
      const resultado = await operacion({ id: 'grupo-tx' });
      estado.commits++;
      return resultado;
    } catch (error) {
      estado.writes = [];
      estado.rollbacks++;
      throw error;
    }
  })
}));
vi.mock('@/lib/transaction/infrastructure', () => ({ resolverTransaccion: () => trx }));
vi.mock('@/lib/transaction/effects', () => ({
  ejecutarEfectosConfirmados: vi.fn(async (tareas: Array<() => void | Promise<void>>) => {
    for (const tarea of tareas) await tarea();
  })
}));
vi.mock('@/lib/utils/image-utils', () => ({
  guardarFotoBaucher: vi.fn(),
  eliminarFotoBaucher: vi.fn()
}));

import {
  entregarGrupoEntradas,
  type EntregaGrupoInput,
  type PlanVentaEntrada,
  type RegistradorVenta
} from '@/modules/entradas';
import { consumirCorteCoverBar, consumirProductoCoverBar } from '@/modules/inventario';
import { registrarMovimientoCobro } from '@/modules/caja';
import { ejecutarEfectosConfirmados } from '@/lib/transaction/effects';
import { rechazarSolicitudCover } from '@/modules/entradas/covers/repositorio';
import { entregaGrupoCoverSchema } from '@/lib/business/schemas/entrada-cover';

const entrada = (id: string) => ({
  id,
  grupo_registro_id: 'compra',
  monto_entrada: 10000,
  metodo_pago: 'efectivo',
  cover_estado: 'pendiente'
});
const producto = (id: string, precio: number, opciones: unknown[] = []) => ({
  id,
  producto_id: `prod-${id}`,
  precio_venta: precio,
  opciones_venta: opciones,
  estado: 1
});
const input: EntregaGrupoInput = {
  entradaIds: ['e1', 'e2'],
  usuarioId: 'cajero',
  montoAdicional: 0,
  unidades: [{ presentacion_id: 'p1', tipo_entrega: 'botella' }]
};

beforeEach(() => {
  vi.clearAllMocks();
  estado.entradas = [entrada('e1'), entrada('e2')];
  estado.presentaciones = [producto('p1', 15000), producto('p2', 5000)];
  estado.solicitud = 'pendiente';
  estado.caja = true;
  estado.commits = 0;
  estado.rollbacks = 0;
  estado.writes = [];
  vi.mocked(consumirProductoCoverBar).mockReset();
  vi.mocked(consumirCorteCoverBar).mockReset();
  db.mockReset();
  trx.mockImplementation(async (sql: string, params: unknown[] = []) => {
    if (sql.startsWith('SELECT estado FROM solicitudes')) return [{ estado: estado.solicitud }];
    if (sql.includes('FROM entradas_clientes WHERE id IN'))
      return estado.entradas.filter(fila => params.includes(fila.id));
    if (sql.includes('FROM inventario_presentaciones')) return estado.presentaciones;
    if (sql.includes('FROM cajas')) return estado.caja ? [{ id_caja: 'caja' }] : [];
    estado.writes.push({ sql, params });
    return [];
  });
});

const venta = () => vi.fn<RegistradorVenta>().mockResolvedValue({ ventaId: 'venta' });

describe('presupuesto compartido de covers', () => {
  it('suma las entradas sin exigir una bebida por persona', async () => {
    const resultado = await entregarGrupoEntradas(input);
    expect(resultado).toMatchObject({
      entradas: 2,
      productos: 1,
      montoEntrada: 20000,
      presupuesto: 20000
    });
    expect(registrarMovimientoCobro).toHaveBeenCalledWith(
      'caja',
      { efectivo: 20000, tarjeta: 0, transferencia: 0 },
      { id: 'grupo-tx' }
    );
    expect(estado.writes.filter(fila => fila.sql.startsWith('UPDATE entradas'))).toHaveLength(2);
    expect(estado.commits).toBe(1);
  });

  it('cobra el aporte completo y utiliza un único contexto para todos los productos', async () => {
    estado.presentaciones[0].precio_venta = 25000;
    const onVenta = venta();
    const resultado = await entregarGrupoEntradas(
      {
        ...input,
        montoAdicional: 10000,
        unidades: [...input.unidades, { presentacion_id: 'p2', tipo_entrega: 'botella' }]
      },
      onVenta
    );
    expect(resultado.montoCobrarBarra).toBe(10000);
    const [plan, contexto] = onVenta.mock.calls[0];
    expect(plan.totalVenta).toBe(30000);
    expect(plan.detalles.map(item => item.sub_total)).toEqual([25000, 5000]);
    expect(contexto).toEqual({ id: 'grupo-tx' });
    expect(onVenta).toHaveBeenCalledTimes(1);
    expect(registrarMovimientoCobro).not.toHaveBeenCalled();
  });

  it('no pierde el aporte aunque los productos cuesten menos que el presupuesto', async () => {
    const onVenta = venta();
    await entregarGrupoEntradas({ ...input, montoAdicional: 20001 }, onVenta);
    const plan: PlanVentaEntrada = onVenta.mock.calls[0][0];
    expect(plan.totalVenta).toBe(40001);
    expect(plan.detalles[0]).toMatchObject({ precio: 15000, sub_total: 40001 });
    const updates = estado.writes.filter(fila => fila.sql.startsWith('UPDATE entradas'));
    expect(updates.map(fila => fila.params[4])).toEqual([10001, 10000]);
  });

  it('permite más productos que entradas y acumula cantidades sin perder sabores', async () => {
    estado.presentaciones[1].opciones_venta = [
      { tipo: 'botella', acompanamiento: { unidades: 1 } }
    ];
    await entregarGrupoEntradas({
      ...input,
      entradaIds: ['e1'],
      unidades: [
        {
          presentacion_id: 'p2',
          tipo_entrega: 'botella',
          acompanamientos: [{ presentacion_id: 'mix1', unidades: 1 }]
        },
        {
          presentacion_id: 'p2',
          tipo_entrega: 'botella',
          acompanamientos: [{ presentacion_id: 'mix2', unidades: 1 }]
        }
      ]
    });
    const insert = estado.writes.find(fila =>
      fila.sql.includes('INSERT INTO entradas_clientes_productos')
    );
    expect(insert?.params.slice(0, 3)).toEqual(['e1', 'p2', 2]);
    expect(JSON.parse(String(insert?.params[4]))).toEqual([
      { presentacion_id: 'mix1', unidades: 1 },
      { presentacion_id: 'mix2', unidades: 1 }
    ]);
  });

  it('utiliza el precio sin anfitriona y no el precio CON', async () => {
    estado.presentaciones[0] = producto('p1', 50000, [
      { tipo: 'botella', precio_sin_anfitriona: 15000 }
    ]);
    await entregarGrupoEntradas(input);
    expect(consumirProductoCoverBar).toHaveBeenCalledTimes(1);
  });

  it('valida el precio del corte y no consume una botella entera', async () => {
    estado.presentaciones[0] = producto('p1', 50000, [{ tipo: 'shot', precio: 5000 }]);
    await entregarGrupoEntradas({
      ...input,
      unidades: [{ presentacion_id: 'p1', tipo_entrega: 'corte' }]
    });
    expect(consumirCorteCoverBar).toHaveBeenCalledTimes(1);
    expect(consumirProductoCoverBar).not.toHaveBeenCalled();
  });

  it('rechaza sobrepresupuesto antes de consumir o postear dinero', async () => {
    estado.presentaciones[0].precio_venta = 20001;
    await expect(entregarGrupoEntradas(input)).rejects.toThrow(/superan el presupuesto/);
    expect(consumirProductoCoverBar).not.toHaveBeenCalled();
    expect(registrarMovimientoCobro).not.toHaveBeenCalled();
    expect(estado.writes).toEqual([]);
  });

  it.each([-1, 0.5, NaN, 2147483648])('rechaza aporte inválido %s', async montoAdicional => {
    await expect(entregarGrupoEntradas({ ...input, montoAdicional })).rejects.toThrow(
      /aporte adicional/
    );
  });

  it('rechaza entradas repetidas', async () => {
    await expect(entregarGrupoEntradas({ ...input, entradaIds: ['e1', 'e1'] })).rejects.toThrow(
      /repetirse/
    );
  });

  it('rechaza entradas de otra compra', async () => {
    estado.entradas[1].grupo_registro_id = 'otra';
    await expect(entregarGrupoEntradas(input)).rejects.toThrow(/misma compra/);
  });

  it('rechaza entradas que ya fueron entregadas', async () => {
    estado.entradas[1].cover_estado = 'entregada';
    await expect(entregarGrupoEntradas(input)).rejects.toThrow(/ya fue entregada/);
  });

  it('no entrega cuando falta caja activa', async () => {
    estado.caja = false;
    await expect(entregarGrupoEntradas(input)).rejects.toThrow(/Abre una caja/);
    expect(consumirProductoCoverBar).not.toHaveBeenCalled();
  });

  it('revierte el lote y no ejecuta efectos cuando falla el segundo consumo', async () => {
    vi.mocked(consumirProductoCoverBar)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Sin stock'));
    await expect(
      entregarGrupoEntradas({
        ...input,
        unidades: [...input.unidades, { presentacion_id: 'p2', tipo_entrega: 'botella' }]
      })
    ).rejects.toThrow('Sin stock');
    expect(estado.rollbacks).toBe(1);
    expect(estado.commits).toBe(0);
    expect(estado.writes).toEqual([]);
    expect(registrarMovimientoCobro).not.toHaveBeenCalled();
    expect(ejecutarEfectosConfirmados).not.toHaveBeenCalled();
  });

  it('aprueba la solicitud dentro de la misma transacción de entrega', async () => {
    await entregarGrupoEntradas({ ...input, solicitudId: 's1' });
    expect(trx).toHaveBeenCalledWith(expect.stringContaining('FOR UPDATE'), ['s1']);
    expect(estado.writes.at(-1)?.sql).toContain('UPDATE solicitudes_entrega_covers');
    expect(estado.commits).toBe(1);
  });

  it('no entrega una solicitud respondida por otra operación', async () => {
    estado.solicitud = 'aprobada';
    await expect(entregarGrupoEntradas({ ...input, solicitudId: 's1' })).rejects.toThrow(
      /ya fue respondida/
    );
    expect(consumirProductoCoverBar).not.toHaveBeenCalled();
  });

  it('no permite que un rechazo tardío sobrescriba una aprobación', async () => {
    db.mockResolvedValue([]);
    await expect(rechazarSolicitudCover('s1', 'cajero', 'No procede')).rejects.toThrow(
      /ya fue respondida/
    );
    expect(db).toHaveBeenCalledWith(
      expect.stringContaining("estado = 'pendiente' RETURNING id"),
      expect.any(Array)
    );
  });

  it('valida formato, enteros y duplicados en el límite HTTP', () => {
    const payload = { entrada_ids: ['e1'], monto_adicional: 1000, unidades: input.unidades };
    expect(entregaGrupoCoverSchema.safeParse(payload).success).toBe(true);
    expect(
      entregaGrupoCoverSchema.safeParse({ ...payload, entrada_ids: ['e1', 'e1'] }).success
    ).toBe(false);
    expect(entregaGrupoCoverSchema.safeParse({ ...payload, monto_adicional: 1.5 }).success).toBe(
      false
    );
    expect(
      entregaGrupoCoverSchema.safeParse({
        ...payload,
        unidades: [{ presentacion_id: 'p1', tipo_entrega: 'otro' }]
      }).success
    ).toBe(false);
  });
});
