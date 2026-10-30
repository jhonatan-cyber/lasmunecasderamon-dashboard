// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Entradas con solicitud de cortesía diferida.
 *
 * Se mockean las fronteras (configuración, inventario, caja, transacción y
 * efectos) y se fija el comportamiento que mueve dinero: la puerta sólo cobra,
 * la barra decide cortesía o adicional, y cada entrada se postea una sola vez.
 */

const db = vi.hoisted(() => ({ query: vi.fn(), secuencia: 0 }));
const estado = vi.hoisted(() => ({
  costoEntrada: 10000,
  tope: 10000,
  precio: 10000,
  opciones: [] as unknown[],
  entrada: null as Record<string, unknown> | null,
  pendientes: [] as Array<Record<string, unknown>>,
  inserts: [] as Array<{ sql: string; params: unknown[] }>,
  updates: [] as Array<{ sql: string; params: unknown[] }>
}));
const trx = vi.hoisted(() => vi.fn());
const baucher = vi.hoisted(() => ({
  guardarFotoBaucher: vi.fn(),
  eliminarFotoBaucher: vi.fn()
}));

vi.mock('@/lib/database/db', () => ({
  query: db.query,
  generateUUID: () => `id-${++db.secuencia}`
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-10-19 12:00:00'
}));

vi.mock('@/modules/inventario', () => ({
  consumirProductoCortesiaBar: vi.fn(),
  consumirCorteCortesiaBar: vi.fn()
}));

vi.mock('@/modules/caja', () => ({
  registrarMovimientoCobro: vi.fn()
}));

vi.mock('@/lib/transaction/contract', () => ({
  enUnaUnidad: async (operacion: (unidad: unknown) => Promise<unknown>) =>
    operacion({ id: 'unidad-1' })
}));

vi.mock('@/lib/transaction/infrastructure', () => ({
  resolverTransaccion: () => trx
}));

vi.mock('@/lib/transaction/effects', () => ({
  ejecutarEfectosConfirmados: vi.fn(async (tareas: Array<() => unknown>) => {
    for (const tarea of tareas) await tarea();
  })
}));

vi.mock('@/lib/utils/image-utils', () => ({
  guardarFotoBaucher: baucher.guardarFotoBaucher,
  eliminarFotoBaucher: baucher.eliminarFotoBaucher
}));

import { entregarEntrada, postearPendientesDeCaja, registrarEntrada } from '@/modules/entradas';
import { consumirCorteCortesiaBar, consumirProductoCortesiaBar } from '@/modules/inventario';
import { registrarMovimientoCobro } from '@/modules/caja';

const registroBase = {
  montoEntrada: 10000,
  cantidadEntradas: 1,
  metodoPago: 'efectivo',
  fecha: '2026-10-19',
  hora: '20:30',
  registradoPor: 'user-1'
};

const entregaBase = { entradaId: 'e1', presentacionId: 'pres-1', usuarioId: 'user-1' };

function entradaPendiente(extra: Record<string, unknown> = {}) {
  return {
    id: 'e1',
    monto_entrada: 10000,
    metodo_pago: 'efectivo',
    cortesia_estado: 'pendiente',
    ...extra
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.secuencia = 0;
  estado.costoEntrada = 10000;
  estado.tope = 10000;
  estado.precio = 10000;
  estado.opciones = [];
  estado.entrada = entradaPendiente();
  estado.pendientes = [];
  estado.inserts = [];
  estado.updates = [];
  baucher.guardarFotoBaucher.mockReset();
  baucher.guardarFotoBaucher.mockResolvedValue('ticket_1718.webp');
  baucher.eliminarFotoBaucher.mockReset();
  db.query.mockImplementation(async (sql: string) =>
    String(sql).includes('monto_base_trago_cortesia_cliente')
      ? [{ valor: String(estado.tope) }]
      : [{ valor: String(estado.costoEntrada) }]
  );
  trx.mockImplementation(async (sql: string, params: unknown[] = []) => {
    if (sql.includes('FROM cajas WHERE estado = 1')) return [{ id_caja: 'caja-1' }];
    if (sql.includes('FROM entradas_clientes WHERE id = ? FOR UPDATE'))
      return estado.entrada ? [estado.entrada] : [];
    if (sql.includes("cortesia_estado = 'pendiente'") && sql.includes('FROM entradas_clientes'))
      return estado.pendientes;
    if (sql.includes('FROM inventario_presentaciones'))
      return [
        {
          id: 'pres-1',
          producto_id: 'prod-1',
          precio_venta: estado.precio,
          opciones_venta: estado.opciones,
          estado: 1
        }
      ];
    if (sql.includes('INSERT INTO entradas_clientes_productos')) {
      estado.inserts.push({ sql, params });
      return [];
    }
    if (sql.includes('INSERT INTO entradas_clientes')) {
      estado.inserts.push({ sql, params });
      return [];
    }
    if (sql.includes('UPDATE entradas_clientes')) {
      estado.updates.push({ sql, params });
      return [];
    }
    return [];
  });
});

describe('registro en la puerta', () => {
  it('deja una fila pendiente por entrada sin tocar caja, stock ni venta', async () => {
    const resultado = await registrarEntrada({
      ...registroBase,
      cantidadEntradas: 2,
      montoEntrada: 20000
    });

    expect(resultado.ids).toHaveLength(2);
    expect(resultado.monto_total).toBe(20000);
    expect(estado.inserts).toHaveLength(2);
    expect(estado.inserts[0].sql).toContain("'pendiente'");
    expect(registrarMovimientoCobro).not.toHaveBeenCalled();
    expect(consumirProductoCortesiaBar).not.toHaveBeenCalled();
  });

  it('guarda la foto del baucher y la deja en cada fila del grupo', async () => {
    const resultado = await registrarEntrada({
      ...registroBase,
      cantidadEntradas: 2,
      montoEntrada: 20000,
      metodoPago: 'transferencia',
      baucherFoto: 'data:image/jpeg;base64,SG9sYQ=='
    });

    expect(baucher.guardarFotoBaucher).toHaveBeenCalledWith(
      'data:image/jpeg;base64,SG9sYQ==',
      'ticket',
      { grupoRegistroId: resultado.grupo_registro_id, registradoPor: 'user-1' }
    );
    expect(estado.inserts).toHaveLength(2);
    for (const insert of estado.inserts) {
      expect(insert.sql).toContain('baucher_foto');
      expect(insert.params).toContain('ticket_1718.webp');
    }
  });

  it('no guarda foto cuando el pago no la trae', async () => {
    await registrarEntrada(registroBase);

    expect(baucher.guardarFotoBaucher).not.toHaveBeenCalled();
  });

  it('rechaza un baucher que no es una imagen antes de tocar la base', async () => {
    await expect(
      registrarEntrada({
        ...registroBase,
        metodoPago: 'transferencia',
        baucherFoto: 'baucher'
      })
    ).rejects.toThrow(/imagen válida/);

    expect(baucher.guardarFotoBaucher).not.toHaveBeenCalled();
    expect(trx).not.toHaveBeenCalled();
  });

  it('rechaza una foto que supera el tope de 3 MB antes de tocar la base', async () => {
    await expect(
      registrarEntrada({
        ...registroBase,
        metodoPago: 'transferencia',
        baucherFoto: `data:image/jpeg;base64,${'A'.repeat(4_000_001)}`
      })
    ).rejects.toThrow(/imagen válida/);

    expect(baucher.guardarFotoBaucher).not.toHaveBeenCalled();
    expect(trx).not.toHaveBeenCalled();
  });

  it('rechaza un total distinto de costo_entrada × entradas sin abrir la unidad', async () => {
    await expect(registrarEntrada({ ...registroBase, montoEntrada: 9000 })).rejects.toThrow(
      /precio de la entrada no coincide/
    );

    expect(trx).not.toHaveBeenCalled();
  });

  it('usa el default del registro cuando la clave de costo no está guardada', async () => {
    db.query.mockResolvedValue([]);

    await expect(registrarEntrada({ ...registroBase, montoEntrada: 1 })).rejects.toThrow(
      /son 10000 por persona/
    );
  });

  it('rechaza un costo configurado no positivo', async () => {
    estado.costoEntrada = 0;

    await expect(registrarEntrada(registroBase)).rejects.toThrow(/no está configurado/);
  });

  it('rechaza cantidades fuera de rango y métodos desconocidos', async () => {
    await expect(registrarEntrada({ ...registroBase, cantidadEntradas: 0 })).rejects.toThrow(
      /entre 1 y 100/
    );
    await expect(registrarEntrada({ ...registroBase, cantidadEntradas: 101 })).rejects.toThrow(
      /entre 1 y 100/
    );
    await expect(registrarEntrada({ ...registroBase, metodoPago: 'bitcoin' })).rejects.toThrow(
      /método de pago válido/
    );
  });

  it('borra la foto si el registro no llega a la base', async () => {
    // La foto se escribe antes de la transacción: con la caja cerrada el alta
    // falla después de guardarla y el archivo quedaría huérfano.
    trx.mockImplementationOnce(async () => []);

    await expect(
      registrarEntrada({
        ...registroBase,
        metodoPago: 'transferencia',
        baucherFoto: 'data:image/jpeg;base64,SG9sYQ=='
      })
    ).rejects.toThrow(/caja/);

    expect(baucher.guardarFotoBaucher).toHaveBeenCalled();
    expect(baucher.eliminarFotoBaucher).toHaveBeenCalledWith(
      'ticket_1718.webp',
      'ticket',
      expect.objectContaining({ registradoPor: 'user-1' })
    );
  });

  it('no borra la foto cuando el registro se confirma', async () => {
    await registrarEntrada({
      ...registroBase,
      metodoPago: 'transferencia',
      baucherFoto: 'data:image/jpeg;base64,SG9sYQ=='
    });

    expect(baucher.guardarFotoBaucher).toHaveBeenCalled();
    expect(baucher.eliminarFotoBaucher).not.toHaveBeenCalled();
  });
});

describe('entrega como cortesía', () => {
  it('consume el stock, postea el precio de la entrada y cierra la fila', async () => {
    const resultado = await entregarEntrada(entregaBase);

    expect(consumirProductoCortesiaBar).toHaveBeenCalledWith(
      'pres-1',
      'user-1',
      '2026-10-19 12:00:00',
      { id: 'unidad-1' },
      10000,
      null
    );
    expect(registrarMovimientoCobro).toHaveBeenCalledWith(
      'caja-1',
      { efectivo: 10000, tarjeta: 0, transferencia: 0 },
      { id: 'unidad-1' }
    );
    expect(resultado).toMatchObject({
      tipo: 'cortesia',
      precio: 10000,
      montoEntrada: 10000,
      montoCobrarBarra: 0,
      ventaId: null
    });
    expect(estado.updates[0].params[4]).toBe(0);
    expect(estado.inserts).toHaveLength(1);
    expect(estado.inserts[0].sql).toContain('entradas_clientes_productos');
  });

  it('trata como cortesía lo que no supera lo ya pagado aunque el tope sea menor', async () => {
    estado.tope = 8000;
    estado.precio = 10000;

    const resultado = await entregarEntrada(entregaBase);

    expect(resultado.tipo).toBe('cortesia');
    expect(registrarMovimientoCobro).toHaveBeenCalledTimes(1);
  });

  it('sirve un corte con el precio del shot y descuenta ml, no la botella', async () => {
    // La botella supera el tope, pero el corte del mismo producto entra como
    // cortesía: es el caso de los destilados de la carta real.
    estado.precio = 10500;
    estado.opciones = [
      { tipo: 'botella', precio: 10500 },
      { tipo: 'shot', precio: 3000 }
    ];

    const resultado = await entregarEntrada({ ...entregaBase, tipoEntrega: 'corte' });

    expect(consumirCorteCortesiaBar).toHaveBeenCalledWith(
      'pres-1',
      'user-1',
      '2026-10-19 12:00:00',
      { id: 'unidad-1' },
      null
    );
    expect(consumirProductoCortesiaBar).not.toHaveBeenCalled();
    expect(resultado).toMatchObject({
      tipo: 'cortesia',
      precio: 3000,
      montoEntrada: 10000,
      montoCobrarBarra: 0
    });
    expect(estado.updates[0].params[4]).toBe(0);
  });

  it('cobra el corte sobre el tope como venta al precio del shot', async () => {
    estado.precio = 10500;
    estado.opciones = [
      { tipo: 'botella', precio: 10500 },
      { tipo: 'shot', precio: 12000 }
    ];
    const onVenta = vi.fn(async () => ({ ventaId: 'venta-1' }));

    const resultado = await entregarEntrada({ ...entregaBase, tipoEntrega: 'corte' }, onVenta);

    expect(consumirCorteCortesiaBar).not.toHaveBeenCalled();
    expect(consumirProductoCortesiaBar).not.toHaveBeenCalled();
    const [plan] = onVenta.mock.calls[0] as unknown as [
      { totalVenta: number; detalles: Array<Record<string, unknown>> }
    ];
    expect(plan.totalVenta).toBe(12000);
    expect(plan.detalles[0]).toMatchObject({
      tipo_venta: 'shot',
      precio: 12000,
      cantidad: 1
    });
    expect(resultado).toMatchObject({
      tipo: 'upgrade',
      precio: 12000,
      montoCobrarBarra: 2000
    });
  });

  it('acompaña el corte con una unidad de bebida analcohólica', async () => {
    estado.precio = 10500;
    estado.opciones = [
      { tipo: 'botella', precio: 10500 },
      { tipo: 'shot', precio: 3000 }
    ];

    await entregarEntrada({
      ...entregaBase,
      tipoEntrega: 'corte',
      acompanamientoPresentacionId: 'mix-1'
    });

    expect(consumirCorteCortesiaBar).toHaveBeenCalledWith(
      'pres-1',
      'user-1',
      '2026-10-19 12:00:00',
      { id: 'unidad-1' },
      'mix-1'
    );
    expect(estado.updates[0].params[3]).toBe('mix-1');
  });

  it('rechaza un corte si el producto no tiene precio de shot', async () => {
    estado.opciones = [{ tipo: 'botella', precio: 9000 }];

    await expect(entregarEntrada({ ...entregaBase, tipoEntrega: 'corte' })).rejects.toThrow(
      /no se vende por corte/
    );
    expect(consumirCorteCortesiaBar).not.toHaveBeenCalled();
  });
});

describe('entrega con adicional', () => {
  it('registra la venta por el precio de lista y no mueve la caja por la entrada', async () => {
    estado.precio = 16000;
    const onVenta = vi.fn(async () => ({ ventaId: 'venta-1' }));

    const resultado = await entregarEntrada(entregaBase, onVenta);

    expect(registrarMovimientoCobro).not.toHaveBeenCalled();
    expect(consumirProductoCortesiaBar).not.toHaveBeenCalled();
    expect(onVenta).toHaveBeenCalledTimes(1);
    const [plan] = onVenta.mock.calls[0] as unknown as [
      { totalVenta: number; entradaId: string; detalles: Array<{ precio: number }> }
    ];
    expect(plan.totalVenta).toBe(16000);
    expect(plan.entradaId).toBe('e1');
    expect(plan.detalles[0].precio).toBe(16000);
    expect(resultado).toMatchObject({
      tipo: 'upgrade',
      montoCobrarBarra: 6000,
      ventaId: 'venta-1'
    });
    expect(estado.updates[0].params[4]).toBe(6000);
  });

  it('respeta el monto que decide el mostrador y lo deja en la entrada', async () => {
    estado.precio = 16000;
    const onVenta = vi.fn(async () => ({ ventaId: 'venta-1' }));

    const resultado = await entregarEntrada({ ...entregaBase, montoAdicional: 20000 }, onVenta);

    const [plan] = onVenta.mock.calls[0] as unknown as [{ totalVenta: number }];
    // Lo posteado es lo cobrado: la entrada de la puerta más el adicional.
    expect(plan.totalVenta).toBe(30000);
    expect(resultado).toMatchObject({ tipo: 'upgrade', montoCobrarBarra: 20000 });
    expect(estado.updates[0].params[4]).toBe(20000);
    expect(consumirProductoCortesiaBar).not.toHaveBeenCalled();
  });

  it('cobra el adicional aunque la bebida no supere el tope de cortesía', async () => {
    estado.tope = 10000;
    estado.precio = 8000;
    const onVenta = vi.fn(async () => ({ ventaId: 'venta-1' }));

    const resultado = await entregarEntrada({ ...entregaBase, montoAdicional: 5000 }, onVenta);

    const [plan] = onVenta.mock.calls[0] as unknown as [{ totalVenta: number }];
    expect(plan.totalVenta).toBe(15000);
    expect(resultado).toMatchObject({ tipo: 'upgrade', montoCobrarBarra: 5000 });
    expect(consumirProductoCortesiaBar).not.toHaveBeenCalled();
  });

  it('rechaza el adicional si el adaptador no puede registrar la venta', async () => {
    estado.precio = 16000;

    await expect(entregarEntrada(entregaBase)).rejects.toThrow(/requiere registrar una venta/);
  });
});

describe('una sola entrega por entrada', () => {
  it('rechaza una fila que ya fue entregada o anulada', async () => {
    estado.entrada = entradaPendiente({ cortesia_estado: 'entregada' });

    await expect(entregarEntrada(entregaBase)).rejects.toThrow(/ya fue entregada o anulada/);
    expect(registrarMovimientoCobro).not.toHaveBeenCalled();
  });

  it('rechaza una entrada inexistente', async () => {
    estado.entrada = null;

    await expect(entregarEntrada(entregaBase)).rejects.toThrow(/ya no existe/);
  });
});

describe('barrido al cerrar la caja', () => {
  it('postea las pendientes agrupadas por método y las cierra como anuladas', async () => {
    estado.pendientes = [
      { id: 'e1', monto_entrada: 10000, metodo_pago: 'efectivo' },
      { id: 'e2', monto_entrada: 10000, metodo_pago: 'tarjeta' },
      { id: 'e3', monto_entrada: 5000, metodo_pago: 'efectivo' }
    ];

    const resultado = await postearPendientesDeCaja({ cajaId: 'caja-1', usuarioId: 'user-1' });

    expect(resultado).toEqual({ entradas: 3, total: 25000 });
    expect(registrarMovimientoCobro).toHaveBeenCalledWith(
      'caja-1',
      { efectivo: 15000, tarjeta: 10000, transferencia: 0 },
      { id: 'unidad-1' }
    );
    expect(estado.updates).toHaveLength(3);
    expect(estado.updates.every(fila => fila.sql.includes("'anulada'"))).toBe(true);
  });

  it('no escribe nada si la caja no tiene pendientes', async () => {
    const resultado = await postearPendientesDeCaja({ cajaId: 'caja-1', usuarioId: 'user-1' });

    expect(resultado).toEqual({ entradas: 0, total: 0 });
    expect(registrarMovimientoCobro).not.toHaveBeenCalled();
  });
});
