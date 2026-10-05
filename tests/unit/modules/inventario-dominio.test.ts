import { describe, it, expect, vi } from 'vitest';
import { ean13CheckDigit, generarEan13Interno } from '@/modules/inventario/helpers';
import { query, withTransaction } from '@/lib/database/db';
import { sendNotificationToAll } from '@/lib/api/sseService';
import {
  aceptarTransferencia,
  confirmarRecepcionEnvase,
  consumirStockBar,
  generarUnidades,
  listarDevoluciones,
  listarStockBar,
  listarTransferencias,
  marcarUnidadesImpresas,
  obtenerResumenShots,
  rechazarTransferencia,
  revertirStockAnulacion,
  sincronizarStockTotal,
  traspasarAlBar,
  verificarEnvase
} from '@/modules/inventario';
import { conContextoOperacionExistente } from '@/lib/transaccion/compatibilidad';

vi.mock('@/lib/database/db', () => ({
  query: vi.fn(),
  generateUUID: () => 'uuid-test',
  withTransaction: vi.fn()
}));

vi.mock('@/lib/api/sseService', () => ({
  sendNotificationToAll: vi.fn()
}));

describe('transferencias de almacén al bar', () => {
  const input = {
    producto_id: 'prod-1',
    presentacion_id: 'pres-1',
    cantidad: 2,
    precio_venta: 1500,
    comision: 100,
    usuario_id: 'user-1'
  };

  it('rechaza stock insuficiente antes de modificar existencias o registrar movimientos', async () => {
    const trx = vi
      .fn()
      .mockResolvedValueOnce([{ id_producto: 'prod-1' }])
      .mockResolvedValueOnce([{ id: 'unit-1' }]);
    await expect(
      conContextoOperacionExistente(trx, contexto => traspasarAlBar(input, contexto))
    ).rejects.toThrow('Stock insuficiente');
    expect(trx).toHaveBeenCalledTimes(2);
    expect(trx.mock.calls.every(([sql]) => sql.trim().startsWith('SELECT'))).toBe(true);
  });

  it('reserva las unidades en tránsito y deja la solicitud pendiente', async () => {
    const trx = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id FROM inventario_unidades'))
        return [{ id: 'unit-1' }, { id: 'unit-2' }];
      if (sql.includes('COUNT(*)')) return [{ total: 3 }];
      return [];
    });
    const options = [
      { tipo: 'botella' as const, precio: 1500, comision: 100 },
      { tipo: 'shot' as const, precio: 300, comision: 0 }
    ];
    const result = await conContextoOperacionExistente(trx, contexto =>
      traspasarAlBar({ ...input, opciones_venta: options }, contexto)
    );
    expect(trx.mock.calls[0][0]).toContain('FOR UPDATE');
    expect(trx).toHaveBeenCalledWith(expect.stringContaining("SET ubicacion = 'transito'"), [
      'uuid-test',
      'unit-1',
      'unit-2'
    ]);
    const movement = trx.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO inventario_movimientos')
    );
    expect(movement).toBeDefined();
    expect(movement![1]).toEqual(
      expect.arrayContaining(['traspaso', 'prod-1', 'pres-1', 2, 'user-1'])
    );
    expect(movement![1]).toContain(JSON.stringify(options));
    // El precio de la presentación se define recién al aceptar, no al solicitar.
    expect(trx.mock.calls.some(([sql]) => sql.includes('UPDATE inventario_presentaciones'))).toBe(
      false
    );
    expect(result).toEqual({ trasladadas: 2, stock_bar: 3 });
  });

  it('emite transfers_updated al crear, aprobar y rechazar (refresco en vivo)', async () => {
    vi.mocked(sendNotificationToAll).mockClear();

    const trx = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id FROM inventario_unidades'))
        return [{ id: 'unit-1' }, { id: 'unit-2' }];
      if (sql.includes('COUNT(*)')) return [{ total: 3 }];
      return [];
    });
    vi.mocked(withTransaction).mockImplementationOnce(async callback => callback(trx));
    await traspasarAlBar(input);
    expect(sendNotificationToAll).toHaveBeenCalledWith('transfers_updated', {
      action: 'created',
      producto_id: 'prod-1',
      presentacion_id: 'pres-1'
    });

    // Aprobación del Barman: el listado del módulo Transferencias se repinta en todas las sesiones.
    const movimiento = {
      id: 'mov-1',
      estado: 'pendiente',
      usuario_id: 'user-1',
      producto_id: 'prod-1',
      presentacion_id: 'pres-1',
      cantidad: 2,
      opciones_venta: [{ tipo: 'botella', precio: 1500, comision: 100 }],
      precio_venta: 1500,
      comision: 100
    };
    const trxAprobar = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('FROM usuarios')) return [{ id_usuario: 'barman-1' }];
      if (sql.includes('SELECT producto_id FROM inventario_movimientos'))
        return [{ producto_id: 'prod-1' }];
      if (sql.includes('SELECT * FROM inventario_movimientos')) return [movimiento];
      if (sql.includes('FROM inventario_unidades')) return [{ id: 'unit-1' }, { id: 'unit-2' }];
      return [];
    });
    vi.mocked(withTransaction).mockImplementationOnce(async callback => callback(trxAprobar));
    await aceptarTransferencia('mov-1', 'barman-1');
    expect(sendNotificationToAll).toHaveBeenCalledWith('transfers_updated', {
      action: 'accepted',
      id: 'mov-1'
    });

    // Rechazo: mismavía de aviso, el historial y los pendientes cambian para todos.
    const trxRechazar = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('FROM usuarios')) return [{ id_usuario: 'barman-1' }];
      if (sql.includes('SELECT producto_id FROM inventario_movimientos'))
        return [{ producto_id: 'prod-1' }];
      if (sql.includes('SELECT * FROM inventario_movimientos')) return [movimiento];
      return [];
    });
    vi.mocked(withTransaction).mockImplementationOnce(async callback => callback(trxRechazar));
    await rechazarTransferencia('mov-1', 'barman-1');
    expect(sendNotificationToAll).toHaveBeenCalledWith('transfers_updated', {
      action: 'rejected',
      id: 'mov-1'
    });
  });
});

describe('listBarStock hereda precio/comisión', () => {
  const baseRow = {
    id: 'pres-1',
    producto_id: 'prod-1',
    nombre: '710 ml',
    codigo_barras: null,
    precio_compra: 10000,
    foto: null,
    stock: 5,
    stock_bar: 2,
    producto_nombre: 'Paceña',
    producto_codigo: 'P1',
    producto_foto: null,
    categoria_nombre: 'Cervezas'
  };

  const mockBar = (row: any) =>
    (query as any).mockImplementation(async (sql: string) => {
      if (sql.includes('FROM inventario_presentaciones')) return [row];
      return [];
    });

  it('muestra la comisión de la presentación aunque opciones_venta traiga 0 (caso Paceña)', async () => {
    mockBar({
      ...baseRow,
      precio_venta: 20000,
      comision: 5000,
      opciones_venta: [{ tipo: 'botella', precio: 20000, comision: 0 }]
    });
    const rows = await listarStockBar();
    expect(rows[0].opciones_venta).toEqual([{ tipo: 'botella', precio: 20000, comision: 5000 }]);
  });

  it('usa la base del producto como último fallback', async () => {
    mockBar({
      ...baseRow,
      precio_venta: 0,
      comision: 0,
      opciones_venta: [{ tipo: 'botella', precio: 0, comision: 0 }],
      producto_precio: 15000,
      producto_comision: 1500
    });
    const rows = await listarStockBar();
    expect(rows[0].opciones_venta).toEqual([{ tipo: 'botella', precio: 15000, comision: 1500 }]);
  });

  it('respeta el 0 cuando no hay nada configurado en ningún nivel', async () => {
    mockBar({ ...baseRow, precio_venta: 0, comision: 0, opciones_venta: null });
    const rows = await listarStockBar();
    expect(rows[0].opciones_venta).toEqual([{ tipo: 'botella', precio: 0, comision: 0 }]);
  });

  it('anula la comisión en venta simple aunque venga configurada (tope 10000)', async () => {
    mockBar({
      ...baseRow,
      precio_venta: 8000,
      comision: 3000,
      opciones_venta: [{ tipo: 'botella', precio: 8000, comision: 3000 }]
    });
    const rows = await listarStockBar();
    expect(rows[0].opciones_venta).toEqual([{ tipo: 'botella', precio: 8000, comision: 0 }]);
  });

  it('no toca la comisión del shot en venta simple', async () => {
    mockBar({
      ...baseRow,
      precio_venta: 8000,
      comision: 0,
      opciones_venta: [
        { tipo: 'botella', precio: 8000, comision: 0 },
        { tipo: 'shot', precio: 3000, comision: 200 }
      ]
    });
    const rows = await listarStockBar();
    expect(rows[0].opciones_venta).toEqual([
      { tipo: 'botella', precio: 8000, comision: 0 },
      { tipo: 'shot', precio: 3000, comision: 200 }
    ]);
  });
  it('conserva el precio del shot para anfitrionas al listar el bar', async () => {
    mockBar({
      ...baseRow,
      precio_venta: 8000,
      comision: 0,
      opciones_venta: [
        { tipo: 'botella', precio: 8000, comision: 0 },
        { tipo: 'shot', precio: 3000, comision: 200, precio_anfitriona: 2000 }
      ]
    });
    const rows = await listarStockBar();
    expect(rows[0].opciones_venta).toEqual([
      { tipo: 'botella', precio: 8000, comision: 0 },
      { tipo: 'shot', precio: 3000, comision: 200, precio_anfitriona: 2000 }
    ]);
  });

  it('descarta un precio de anfitriona en 0 (mismo precio que el cliente)', async () => {
    mockBar({
      ...baseRow,
      opciones_venta: [{ tipo: 'shot', precio: 3000, comision: 0, precio_anfitriona: 0 }]
    });
    const rows = await listarStockBar();
    expect(rows[0].opciones_venta).toEqual([{ tipo: 'shot', precio: 3000, comision: 0 }]);
  });

  it('expone los ml de la botella abierta y los servidos históricos', async () => {
    mockBar({
      ...baseRow,
      precio_venta: 20000,
      comision: 5000,
      ml_abierta: 650,
      ml_servidos: 1250
    });
    const rows = await listarStockBar();
    expect(rows[0].ml_abierta).toBe(650);
    expect(rows[0].ml_servidos).toBe(1250);
    // El histórico sale de los movimientos de venta con ml, por presentación.
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('AS ml_servidos'),
      expect.anything()
    );
  });

  it('sin datos de shots los campos quedan en 0/ausentes sin romper el listado', async () => {
    mockBar({ ...baseRow, precio_venta: 20000, comision: 5000 });
    const rows = await listarStockBar();
    expect(rows[0].opciones_venta).toEqual([{ tipo: 'botella', precio: 20000, comision: 5000 }]);
  });
});

describe('listarTransferencias historial', () => {
  it('muestra quién recibió y completa la comisión con la presentación actual', async () => {
    (query as any).mockImplementation(async (sql: string) => {
      if (sql.includes('FROM inventario_movimientos')) {
        return [
          {
            id: 'mov-1',
            cantidad: 2,
            fecha_crea: '2026-09-21T19:59:02',
            precio_venta: 20000,
            comision: 0,
            opciones_venta: [{ tipo: 'botella', precio: 20000, comision: 0 }],
            estado: 'aceptada',
            usuario_id: 'u1',
            aceptado_por: 'u2',
            fecha_aceptacion: '2026-09-21T19:59:19',
            producto_nombre: 'Paceña',
            presentacion_nombre: '710 ml',
            usuario_nombre: 'cajero',
            aceptado_nombre: 'barman',
            pres_precio: 20000,
            pres_comision: 5000,
            producto_precio: 0,
            producto_comision: 0
          }
        ];
      }
      return [];
    });
    const rows = await listarTransferencias();
    expect(rows[0].aceptado_nombre).toBe('barman');
    expect(rows[0].opciones_venta).toEqual([{ tipo: 'botella', precio: 20000, comision: 5000 }]);
  });
});

describe('ean13CheckDigit', () => {
  it('calcula el dígito del ejemplo oficial GS1 (5901234123457)', () => {
    expect(ean13CheckDigit('590123412345')).toBe(7);
  });

  it('devuelve 0 cuando la suma es múltiplo de 10', () => {
    expect(ean13CheckDigit('000000000000')).toBe(0);
  });
});

describe('unidades de compras', () => {
  it('registra la impresion del lote sin modificar stock', async () => {
    const saved = [{ id: 'unit-1', fecha_impresion: '2026-09-22T17:00:00Z' }];
    const trx = vi
      .fn()
      .mockResolvedValueOnce([{ id: 'unit-1' }])
      .mockResolvedValueOnce(saved);
    vi.mocked(withTransaction).mockImplementationOnce(async callback => callback(trx));
    expect(await marcarUnidadesImpresas(['unit-1'])).toEqual(saved);
    expect(trx).toHaveBeenLastCalledWith(
      expect.stringContaining('SET fecha_impresion = CURRENT_TIMESTAMP'),
      ['unit-1']
    );
    expect(trx.mock.calls.some(([sql]) => sql.includes('UPDATE productos'))).toBe(false);
  });

  it('filtra el detalle por producto conservando los precios resueltos del bar', async () => {
    vi.mocked(query).mockImplementation(async (sql: string): Promise<any> =>
      sql.includes('FROM inventario_presentaciones')
        ? [
            {
              id: 'pres-1',
              producto_id: 'prod-1',
              precio_venta: 0,
              comision: 0,
              producto_precio: 25000,
              producto_comision: 5000
            }
          ]
        : []
    );
    const rows = await listarStockBar('prod-1');
    expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE p.producto_id = ?'), [
      'prod-1'
    ]);
    expect(rows[0].opciones_venta).toEqual([{ tipo: 'botella', precio: 25000, comision: 5000 }]);
  });

  it('rechaza un lote incompleto antes de marcar ninguna unidad', async () => {
    const trx = vi.fn().mockResolvedValueOnce([]);
    vi.mocked(withTransaction).mockImplementationOnce(async callback => callback(trx));
    await expect(marcarUnidadesImpresas(['missing'])).rejects.toThrow('ya no existen');
    expect(trx).toHaveBeenCalledTimes(1);
  });
  it('agrega unidades nuevas con origen sin modificar los codigos anteriores y sincroniza el stock', async () => {
    let sequence = 10;
    const inserted: Record<string, unknown>[] = [];
    const trx = vi.fn().mockImplementation(async (sql: string, values: unknown[] = []) => {
      if (sql.includes('nextval')) {
        const count = Number(values[0] ?? 1);
        const rows = Array.from({ length: count }, (_, i) => ({ seq: sequence + 1 + i }));
        sequence += count;
        return rows;
      }
      if (sql.includes('codigo_barras IN')) return [];
      if (sql.startsWith('INSERT INTO inventario_unidades')) {
        const columns = sql.match(/\(([^)]+)\)/)![1].split(', ');
        const rowCount = (sql.match(/\),\s*\(/g) || []).length + 1;
        for (let r = 0; r < rowCount; r++) {
          const rowValues = values.slice(r * columns.length, (r + 1) * columns.length);
          inserted.push(Object.fromEntries(columns.map((column, i) => [column, rowValues[i]])));
        }
      }
      if (sql.includes('COUNT(*)')) return [{ total: 5 + inserted.length }];
      return [];
    });

    const codes = await conContextoOperacionExistente(trx, contexto =>
      generarUnidades(
        { producto_id: 'prod-1', cantidad: 2, presentacion_id: 'pres-1', compra_id: 'comp-2' },
        contexto
      )
    );
    await conContextoOperacionExistente(trx, contexto => sincronizarStockTotal('prod-1', contexto));

    expect(codes.map(c => c.codigo)).toEqual(['LM-000011', 'LM-000012']);
    expect(inserted).toHaveLength(2);
    for (const row of inserted) {
      expect(row).toMatchObject({
        compra_id: 'comp-2',
        ubicacion: 'almacen',
        estado: 'almacen',
        presentacion_id: 'pres-1'
      });
      expect(row.codigo_barras).toMatch(/^29\d{11}$/);
    }
    expect(new Set(inserted.map(r => r.codigo_barras)).size).toBe(2);
    expect(trx.mock.calls.some(([sql]) => sql.startsWith('UPDATE inventario_unidades'))).toBe(
      false
    );
    expect(trx).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE productos SET stock_almacen'),
      expect.arrayContaining([7, 'prod-1'])
    );
  });
});

describe('generarEan13Interno', () => {
  it('genera un EAN-13 válido con prefijo interno 29', () => {
    for (let i = 0; i < 50; i++) {
      const codigo = generarEan13Interno();
      expect(codigo).toMatch(/^29\d{11}$/);
      expect(ean13CheckDigit(codigo.slice(0, 12))).toBe(Number(codigo[12]));
    }
  });

  it('genera códigos diferentes entre sí', () => {
    const generados = new Set(Array.from({ length: 100 }, () => generarEan13Interno()));
    expect(generados.size).toBeGreaterThan(90);
  });
});

describe('descuento del bar al registrar una venta', () => {
  const contexto = { usuarioId: 'user-1', fecha: '2026-09-24 10:00:00' };
  const presentacion = {
    id: 'pres-1',
    producto_id: 'prod-1',
    nombre: 'Whisky 750 ml',
    precio_venta: 45000,
    comision: 5000,
    ml_botella: null
  };

  // Las unidades traen `ml_restante` (null = llena) para poder servir shots.
  function trxCon(
    disponibles: { id: string; ml_restante?: number | null }[],
    pres: Record<string, unknown> = presentacion
  ) {
    return vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('FROM inventario_presentaciones')) return [pres];
      if (sql.includes('FROM inventario_unidades')) return disponibles;
      return [];
    });
  }

  const movimiento = (trx: any) =>
    trx.mock.calls.find(([sql]: string[]) => sql.includes('INSERT INTO inventario_movimientos'));

  const consumirStockConTransaccion = (trx: any, detalles: any[], contextoVenta: any) =>
    conContextoOperacionExistente(trx, contexto =>
      consumirStockBar(detalles, contextoVenta, contexto)
    );

  it('ignora los detalles sin presentación: el catálogo anterior no tiene inventario', async () => {
    const trx = vi.fn();

    await consumirStockConTransaccion(
      trx,
      [{ presentacion_id: null, cantidad: 3 }, { cantidad: 1 }],
      contexto
    );

    expect(trx).not.toHaveBeenCalled();
  });

  it('suma las cantidades de la misma presentación en un solo descuento', async () => {
    const trx = trxCon([{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }]);

    await consumirStockConTransaccion(
      trx,
      [
        { presentacion_id: 'pres-1', cantidad: 2 },
        { presentacion_id: 'pres-1', cantidad: 1 }
      ],
      contexto
    );

    const seleccion = trx.mock.calls.find(([sql]) => sql.includes('FROM inventario_unidades'));
    expect(seleccion![0]).toContain('FOR UPDATE');
    expect(seleccion![1]).toEqual(['pres-1']);
    expect(movimiento(trx)![1]).toEqual(expect.arrayContaining([3]));
  });

  it('bloquea la presentación, marca las unidades como vendidas y registra el movimiento', async () => {
    const trx = trxCon([{ id: 'u1' }, { id: 'u2' }]);

    await consumirStockConTransaccion(trx, [{ presentacion_id: 'pres-1', cantidad: 2 }], contexto);

    expect(trx.mock.calls[0][0]).toContain('FOR UPDATE');
    const descuento = trx.mock.calls.find(([sql]) => sql.includes('SET estado ='));
    expect(descuento![0]).toContain("SET estado = 'vendida'");
    expect(descuento![1]).toEqual(['u1', 'u2']);
    const movimiento = trx.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO inventario_movimientos')
    );
    expect(movimiento).toBeDefined();
    expect(movimiento![1]).toEqual(
      expect.arrayContaining(['venta', 'completada', 'prod-1', 'pres-1', 2, 'user-1'])
    );
  });

  it('deja constancia de qué unidades tocó el consumo y cuánta ml les quitó', async () => {
    const trx = trxCon([
      { id: 'u1', ml_restante: 50 },
      { id: 'u2', ml_restante: null }
    ]);

    await consumirStockConTransaccion(
      trx,
      [{ presentacion_id: 'pres-1', cantidad: 2, tipo_venta: 'shot' }],
      { ...contexto, ventaId: 'venta-9' }
    );

    const movimiento = trx.mock.calls.find(([sql]: string[]) =>
      sql.includes('INSERT INTO inventario_movimientos')
    );
    expect(movimiento![1]).toEqual(expect.arrayContaining(['venta-9']));
    // El primer shot vació u1 y el segundo abrió u2 en esta misma venta: la
    // diferencia con su ml_restante (0) no diría cuánto salió de ella, por eso se
    // guarda lo que el movimiento le quitó a cada una.
    const trazabilidad = trx.mock.calls.find(([sql]: string[]) =>
      sql.includes('INSERT INTO inventario_movimiento_unidades')
    );
    expect(trazabilidad![1]).toEqual([movimiento![1][0], 'u1', 50, movimiento![1][0], 'u2', 50]);
  });

  it('una botella vendida entera no cuenta como ml consumida', async () => {
    const trx = trxCon([{ id: 'u1', ml_restante: null }]);

    await consumirStockConTransaccion(trx, [{ presentacion_id: 'pres-1', cantidad: 1 }], {
      ...contexto,
      ventaId: 'venta-9'
    });

    const trazabilidad = trx.mock.calls.find(([sql]: string[]) =>
      sql.includes('INSERT INTO inventario_movimiento_unidades')
    );
    expect(trazabilidad![1].slice(-1)).toEqual([0]);
  });

  it('rechaza la venta sin modificar nada cuando no alcanzan las botellas', async () => {
    const trx = trxCon([{ id: 'u1' }]);

    await expect(
      consumirStockConTransaccion(trx, [{ presentacion_id: 'pres-1', cantidad: 2 }], contexto)
    ).rejects.toMatchObject({
      code: 'INSUFFICIENT_BAR_STOCK',
      details: { presentacion_id: 'pres-1', disponibles: 1, requeridas: 2 }
    });

    expect(trx.mock.calls.every(([sql]) => sql.trim().startsWith('SELECT'))).toBe(true);
  });

  it('sin unidades en el bar también rechaza, en lugar de vender humo', async () => {
    const trx = trxCon([]);

    await expect(
      consumirStockConTransaccion(trx, [{ presentacion_id: 'pres-1', cantidad: 1 }], contexto)
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_BAR_STOCK' });
    expect(trx).toHaveBeenCalledTimes(2);
  });

  it('no falla si la presentación ya no existe (unidades huérfanas)', async () => {
    const trx = vi.fn().mockResolvedValue([]);

    await expect(
      consumirStockConTransaccion(trx, [{ presentacion_id: 'pres-1', cantidad: 1 }], contexto)
    ).resolves.toEqual([]);
    expect(trx).toHaveBeenCalledTimes(1);
  });

  it('un shot descuenta ml de la botella abierta sin gastar unidades', async () => {
    const trx = trxCon([
      { id: 'u1', ml_restante: 800 },
      { id: 'u2', ml_restante: null }
    ]);

    await consumirStockConTransaccion(
      trx,
      [{ presentacion_id: 'pres-1', cantidad: 2, tipo_venta: 'shot' }],
      contexto
    );

    // 2 shots x 50 ml = 100 ml menos en la botella abierta.
    const descuentoMl = trx.mock.calls.find(([sql]: string[]) =>
      sql.includes('SET ml_restante = ?')
    );
    expect(descuentoMl![1]).toEqual([700, 'u1']);
    // La botella queda marcada como abierta por shots: es la que vuelve como envase.
    expect(descuentoMl![0]).toContain('abierta_por_shots = true');
    expect(trx.mock.calls.some(([sql]: string[]) => sql.includes("SET estado = 'vendida'"))).toBe(
      false
    );
    expect(movimiento(trx)![1]).toEqual(expect.arrayContaining([0, 100]));
  });

  it('abre una botella llena cuando no hay ninguna abierta', async () => {
    const trx = trxCon([{ id: 'u1', ml_restante: null }]);

    await consumirStockConTransaccion(
      trx,
      [{ presentacion_id: 'pres-1', cantidad: 1, tipo_venta: 'shot' }],
      contexto
    );

    // Botella por defecto de 750 ml menos un shot de 50.
    const descuentoMl = trx.mock.calls.find(([sql]: string[]) =>
      sql.includes('SET ml_restante = ?')
    );
    expect(descuentoMl![1]).toEqual([700, 'u1']);
    expect(trx.mock.calls.some(([sql]: string[]) => sql.includes("SET estado = 'vendida'"))).toBe(
      false
    );
  });

  it('respeta los ml propios de la presentación', async () => {
    const trx = trxCon([{ id: 'u1', ml_restante: null }], { ...presentacion, ml_botella: 1000 });

    await consumirStockConTransaccion(
      trx,
      [{ presentacion_id: 'pres-1', cantidad: 4, tipo_venta: 'shot' }],
      contexto
    );

    const descuentoMl = trx.mock.calls.find(([sql]: string[]) =>
      sql.includes('SET ml_restante = ?')
    );
    expect(descuentoMl![1]).toEqual([800, 'u1']);
  });

  it('abre la botella con la capacidad que declara el nombre de la presentación', async () => {
    // Regreso del bar: "1000 ml" sin `ml_botella` guardada se abría con el default de 750
    // y un shot de 50 ml dejaba 700 ml. Con el nombre mandando, quedan 950 ml.
    const trx = trxCon([{ id: 'u1', ml_restante: null }], {
      ...presentacion,
      nombre: '1000 ml',
      ml_botella: null
    });

    await consumirStockConTransaccion(
      trx,
      [{ presentacion_id: 'pres-1', cantidad: 1, tipo_venta: 'shot' }],
      contexto
    );

    const descuentoMl = trx.mock.calls.find(([sql]: string[]) =>
      sql.includes('SET ml_restante = ?')
    );
    expect(descuentoMl![1]).toEqual([950, 'u1']);
  });

  it('la capacidad guardada manda sobre la del nombre', async () => {
    const trx = trxCon([{ id: 'u1', ml_restante: null }], {
      ...presentacion,
      nombre: '1000 ml',
      ml_botella: 375
    });

    await consumirStockConTransaccion(
      trx,
      [{ presentacion_id: 'pres-1', cantidad: 1, tipo_venta: 'shot' }],
      contexto
    );

    const descuentoMl = trx.mock.calls.find(([sql]: string[]) =>
      sql.includes('SET ml_restante = ?')
    );
    expect(descuentoMl![1]).toEqual([325, 'u1']);
  });

  it('vacía la botella abierta y sigue con la siguiente cuando no alcanza', async () => {
    const trx = trxCon([
      { id: 'u1', ml_restante: 40 },
      { id: 'u2', ml_restante: null }
    ]);

    await consumirStockConTransaccion(
      trx,
      [{ presentacion_id: 'pres-1', cantidad: 1, tipo_venta: 'shot' }],
      contexto
    );

    const vendidas = trx.mock.calls.find(([sql]: string[]) =>
      sql.includes("SET estado = 'vendida'")
    );
    expect(vendidas![1]).toEqual(['u1']);
    const abierta = trx.mock.calls.find(([sql]: string[]) => sql.includes('SET ml_restante = ?'));
    expect(abierta![1]).toEqual([740, 'u2']);
  });

  it('devuelve la alerta cuando la botella cruza el umbral de shots restantes', async () => {
    // 160 ml > umbral (50 x 3 = 150) → al servir 2 shots quedan 60: toca avisar.
    const trx = trxCon([{ id: 'u1', ml_restante: 160 }]);

    const alertas = await consumirStockConTransaccion(
      trx,
      [{ presentacion_id: 'pres-1', cantidad: 2, tipo_venta: 'shot' }],
      contexto
    );

    expect(alertas).toEqual([
      { presentacion_id: 'pres-1', nombre: 'Whisky 750 ml', ml_restante: 60, shots_restantes: 1 }
    ]);
  });

  it('no avisa si la botella ya estaba en el umbral ni si sigue por encima', async () => {
    // Ya estaba bajo el umbral: no vuelve a avisar por cada shot siguiente.
    const yaAvisada = trxCon([{ id: 'u1', ml_restante: 100 }]);
    expect(
      await consumirStockConTransaccion(
        yaAvisada,
        [{ presentacion_id: 'pres-1', cantidad: 1, tipo_venta: 'shot' }],
        contexto
      )
    ).toEqual([]);

    // Sigue por encima del umbral: tampoco hay aviso.
    const holgada = trxCon([{ id: 'u1', ml_restante: 700 }]);
    expect(
      await consumirStockConTransaccion(
        holgada,
        [{ presentacion_id: 'pres-1', cantidad: 1, tipo_venta: 'shot' }],
        contexto
      )
    ).toEqual([]);

    // Venta de botella completa: el umbral es de shots, no aplica.
    const botella = trxCon([{ id: 'u1', ml_restante: null }]);
    expect(
      await consumirStockConTransaccion(
        botella,
        [{ presentacion_id: 'pres-1', cantidad: 1 }],
        contexto
      )
    ).toEqual([]);
  });

  it('rechaza el shot cuando no hay ml disponibles en el bar', async () => {
    const trx = trxCon([]);

    await expect(
      consumirStockConTransaccion(
        trx,
        [{ presentacion_id: 'pres-1', cantidad: 3, tipo_venta: 'shot' }],
        contexto
      )
    ).rejects.toMatchObject({
      code: 'INSUFFICIENT_BAR_STOCK',
      details: {
        presentacion_id: 'pres-1',
        disponibles: 0,
        requeridas: 3,
        ml_requeridos: 150
      }
    });
    expect(trx.mock.calls.every(([sql]: string[]) => sql.trim().startsWith('SELECT'))).toBe(true);
  });

  it('combina botellas completas y shots en la misma venta', async () => {
    const trx = trxCon([
      { id: 'u1', ml_restante: 500 },
      { id: 'u2', ml_restante: null },
      { id: 'u3', ml_restante: null }
    ]);

    await consumirStockConTransaccion(
      trx,
      [
        { presentacion_id: 'pres-1', cantidad: 1, tipo_venta: 'shot' },
        { presentacion_id: 'pres-1', cantidad: 1, tipo_venta: 'botella' }
      ],
      contexto
    );

    const abierta = trx.mock.calls.find(([sql]: string[]) => sql.includes('SET ml_restante = ?'));
    expect(abierta![1]).toEqual([450, 'u1']);
    const vendidas = trx.mock.calls.find(([sql]: string[]) =>
      sql.includes("SET estado = 'vendida'")
    );
    expect(vendidas![1]).toEqual(['u2']);
    expect(movimiento(trx)![1]).toEqual(expect.arrayContaining([1, 50]));
  });

  it('descuenta ml distintos para shots de cliente y de anfitriona', async () => {
    const trx = trxCon([{ id: 'u1', ml_restante: 800 }], {
      ...presentacion,
      ml_shot: 50,
      ml_shot_anfitriona: 30
    });

    await consumirStockConTransaccion(
      trx,
      [
        { presentacion_id: 'pres-1', cantidad: 1, tipo_venta: 'shot' },
        { presentacion_id: 'pres-1', cantidad: 1, tipo_venta: 'shot', shot_anfitriona: true }
      ],
      contexto
    );

    // 1 x 50 ml (cliente) + 1 x 30 ml (anfitriona) = 80 ml menos.
    const descuentoMl = trx.mock.calls.find(([sql]: string[]) =>
      sql.includes('SET ml_restante = ?')
    );
    expect(descuentoMl![1]).toEqual([720, 'u1']);
    expect(movimiento(trx)![1]).toEqual(expect.arrayContaining([0, 80]));
  });

  it('el shot de anfitriona usa el ml de cliente cuando no tiene propio', async () => {
    const trx = trxCon([{ id: 'u1', ml_restante: 800 }], { ...presentacion, ml_shot: 60 });

    await consumirStockConTransaccion(
      trx,
      [
        { presentacion_id: 'pres-1', cantidad: 1, tipo_venta: 'shot' },
        { presentacion_id: 'pres-1', cantidad: 2, tipo_venta: 'shot', shot_anfitriona: true }
      ],
      contexto
    );

    // 3 x 60 ml = 180 ml menos.
    const descuentoMl = trx.mock.calls.find(([sql]: string[]) =>
      sql.includes('SET ml_restante = ?')
    );
    expect(descuentoMl![1]).toEqual([620, 'u1']);
  });
});

describe('resumen de shots del bar', () => {
  it('suma los ml servidos hoy, los restantes y las botellas por agotarse', async () => {
    vi.mocked(query).mockClear();
    (query as any).mockImplementation(async (sql: string) => {
      if (sql.includes('FROM configuraciones'))
        return [
          { clave: 'shot_ml', valor: '50' },
          { clave: 'shots_alerta', valor: '2' }
        ];
      if (sql.includes('FROM inventario_movimientos')) return [{ ml: 350, shots: 7 }];
      if (sql.includes('FROM inventario_unidades'))
        return [{ botellas: 3, ml: 400, por_agotarse: 2 }];
      return [];
    });

    const resumen = await obtenerResumenShots();

    expect(resumen).toEqual({
      shotMl: 50,
      shotsAlerta: 2,
      mlServidosHoy: 350,
      shotsServidosHoy: 7,
      mlRestantesTotales: 400,
      botellasAbiertas: 3,
      botellasPorAgotarse: 2
    });
    // La alerta se compara en ml: shots_alerta x ml por shot (por producto o global).
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('ml_restante <= (COALESCE(NULLIF(pr.ml_shot, 0), ?) * ?)'),
      [50, 2]
    );
    // Los shots se dividen con el ml por shot de cada producto (fallback al global).
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('NULLIF(pr.ml_shot, 0)'),
      expect.anything()
    );
    // "Hoy" se calcula desde el inicio del día en la zona horaria del negocio.
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('fecha_crea >= ?'),
      expect.arrayContaining([expect.stringMatching(/^\d{4}-\d{2}-\d{2} 00:00:00$/)])
    );
  });

  it('usa los defaults cuando Configuraciones no tiene las claves', async () => {
    (query as any).mockImplementation(async (sql: string) => {
      if (sql.includes('FROM configuraciones')) return [];
      if (sql.includes('FROM inventario_movimientos')) return [{ ml: 0 }];
      if (sql.includes('FROM inventario_unidades'))
        return [{ botellas: 0, ml: 0, por_agotarse: 0 }];
      return [];
    });

    const resumen = await obtenerResumenShots();
    expect(resumen.shotMl).toBe(50);
    expect(resumen.shotsAlerta).toBe(3);
    expect(resumen.shotsServidosHoy).toBe(0);
    expect(resumen.botellasPorAgotarse).toBe(0);
  });
});

describe('control de devolución de envases', () => {
  const envase = (extra: Record<string, unknown> = {}) => ({
    id: 'unidad-1',
    codigo: 'LM-000123',
    codigo_barras: '2912345678901',
    estado: 'vendida',
    abierta_por_shots: true,
    fecha_devolucion: null,
    devuelto_por: null,
    fecha_confirmacion: null,
    confirmado_por: null,
    producto_nombre: 'Paceña',
    presentacion_nombre: '750 ml',
    compra_folio: 'C-001',
    ...extra
  });

  /** trx simulado: la búsqueda devuelve `busqueda` y la marca `marcado`. */
  const trxCon = (busqueda: any[], marcado: any[] = [{ id: 'unidad-1' }]) =>
    vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('SET fecha_devolucion = ?')) return marcado;
      if (sql.includes('FROM inventario_unidades')) return busqueda;
      return [];
    });

  const busqueda = (trx: any) =>
    trx.mock.calls.find(([sql]: [string]) => sql.includes('FROM inventario_unidades'))!;
  const marca = (trx: any) =>
    trx.mock.calls.find(([sql]: [string]) => sql.includes('SET fecha_devolucion = ?'));

  it('marca como devuelto un envase nuestro, vacío y pendiente', async () => {
    const trx = trxCon([envase()]);

    const resultado = await conContextoOperacionExistente(trx, contexto =>
      verificarEnvase(' 2912345678901 ', 'user-1', contexto)
    );

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.unidad).toMatchObject({
        id: 'unidad-1',
        codigo: 'LM-000123',
        producto_nombre: 'Paceña',
        presentacion_nombre: '750 ml'
      });
      expect(resultado.unidad.fecha_devolucion).toEqual(expect.any(String));
    }
    // La lectura bloquea la fila hasta que termina la transacción.
    expect(busqueda(trx)[0]).toContain('FOR UPDATE OF u');
    // La marca lleva hora del negocio, quién verificó, y solo acepta
    // unidades vacías que todavía no se devolvieron.
    expect(marca(trx)![0]).toContain('fecha_devolucion IS NULL');
    expect(marca(trx)![1]).toEqual([expect.any(String), 'user-1', 'unidad-1', 'vendida']);
  });

  it('rechaza un código que no está en nuestro inventario sin escribir nada', async () => {
    const trx = trxCon([]);

    const resultado = await conContextoOperacionExistente(trx, contexto =>
      verificarEnvase('7899999999999', 'user-1', contexto)
    );

    expect(resultado).toMatchObject({ ok: false, motivo: 'no_es_nuestro', unidad: null });
    expect(trx).toHaveBeenCalledTimes(1);
  });

  it('rechaza un envase nuestro que no está vacío', async () => {
    const trx = trxCon([envase({ estado: 'almacen' })]);

    const resultado = await conContextoOperacionExistente(trx, contexto =>
      verificarEnvase('LM-000123', 'user-1', contexto)
    );

    expect(resultado).toMatchObject({ ok: false, motivo: 'no_esta_vacia' });
    expect(trx).toHaveBeenCalledTimes(1);
  });

  it('detecta el re-escaneo de un envase ya devuelto y trae la fecha anterior', async () => {
    const trx = trxCon([envase({ fecha_devolucion: '2026-09-20 22:30:00' })]);

    const resultado = await conContextoOperacionExistente(trx, contexto =>
      verificarEnvase('LM-000123', 'user-1', contexto)
    );

    expect(resultado).toMatchObject({ ok: false, motivo: 'ya_devuelto' });
    if (!resultado.ok && resultado.unidad) {
      expect(resultado.unidad.fecha_devolucion).toBe('2026-09-20 22:30:00');
    }
    expect(trx).toHaveBeenCalledTimes(1);
  });

  it('rechaza la botella que se vendió entera: su envase no vuelve al bar', async () => {
    const trx = trxCon([envase({ abierta_por_shots: false })]);

    const resultado = await conContextoOperacionExistente(trx, contexto =>
      verificarEnvase('LM-000123', 'user-1', contexto)
    );

    expect(resultado).toMatchObject({ ok: false, motivo: 'venta_entera' });
    expect(trx).toHaveBeenCalledTimes(1);
  });

  it('exige un código para verificar', async () => {
    const trx = trxCon([]);

    await expect(
      conContextoOperacionExistente(trx, contexto => verificarEnvase('   ', null, contexto))
    ).rejects.toThrow('código del envase');
    expect(trx).not.toHaveBeenCalled();
  });

  it('normaliza el escaneo (espacios y minúsculas) al buscar por barra o SKU', async () => {
    const trx = trxCon([envase()]);

    await conContextoOperacionExistente(trx, contexto =>
      verificarEnvase('  lm-000123  ', 'user-1', contexto)
    );

    expect(trx.mock.calls[0][1]).toEqual(['LM-000123', 'LM-000123']);
  });

  it('el escaneo corre dentro de una transacción (wrapper público)', async () => {
    const trx = trxCon([envase()]);
    (withTransaction as any).mockImplementationOnce(async (cb: any) => await cb(trx));

    const resultado = await verificarEnvase('2912345678901', 'user-1');

    expect(vi.mocked(withTransaction)).toHaveBeenCalledTimes(1);
    expect(resultado.ok).toBe(true);
  });

  it('lista el historial con entrega, recepción y estado de confirmación', async () => {
    vi.mocked(query).mockClear();
    (query as any).mockImplementation(async (sql: string) => {
      if (sql.includes('FROM inventario_unidades'))
        return [
          {
            ...envase({
              fecha_devolucion: '2026-09-20 22:30:00',
              devuelto_por: 'user-1',
              fecha_confirmacion: '2026-09-21 08:05:00',
              confirmado_por: 'user-2'
            }),
            usuario_nombre: 'Rosa',
            usuario_apellido: 'Pérez',
            usuario_nick: 'rosa',
            confirmado_nombre: 'Julián',
            confirmado_apellido: 'Soto',
            confirmado_nick: 'julian'
          },
          {
            ...envase({
              id: 'unidad-2',
              codigo: 'LM-000124',
              fecha_devolucion: '2026-09-19 20:00:00',
              devuelto_por: 'user-1'
            }),
            usuario_nick: 'rosa'
          }
        ];
      return [];
    });

    const historial = await listarDevoluciones();

    expect(historial).toHaveLength(2);
    expect(historial[0]).toMatchObject({
      codigo: 'LM-000123',
      producto_nombre: 'Paceña',
      compra_folio: 'C-001',
      usuario_nick: 'rosa',
      confirmado_nick: 'julian',
      pendiente_confirmacion: false
    });
    expect(historial[1]).toMatchObject({
      codigo: 'LM-000124',
      confirmado_por: null,
      pendiente_confirmacion: true
    });
    const [sql, params] = (query as any).mock.calls.at(-1);
    expect(sql).toContain('WHERE u.fecha_devolucion IS NOT NULL');
    expect(sql).toContain('ORDER BY u.fecha_devolucion DESC');
    expect(sql).toContain('u.fecha_confirmacion');
    expect(params).toEqual([100]);
  });

  /** trx simulado del paso del almacén: búsqueda y marca de confirmación. */
  const trxConfirm = (busqueda: any[], confirmada: any[] = [{ id: 'unidad-1' }]) =>
    vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('SET fecha_confirmacion = ?')) return confirmada;
      if (sql.includes('FROM inventario_unidades')) return busqueda;
      return [];
    });

  const marcaConfirmacion = (trx: any) =>
    trx.mock.calls.find(([sql]: [string]) => sql.includes('SET fecha_confirmacion = ?'));

  it('confirma la recepción de un envase entregado por el bar', async () => {
    const trx = trxConfirm([
      envase({ fecha_devolucion: '2026-09-20 22:30:00', devuelto_por: 'user-1' })
    ]);

    const resultado = await conContextoOperacionExistente(trx, contexto =>
      confirmarRecepcionEnvase(' LM-000123 ', 'user-2', contexto)
    );

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.unidad).toMatchObject({ id: 'unidad-1', codigo: 'LM-000123' });
      expect(resultado.unidad.fecha_confirmacion).toEqual(expect.any(String));
    }
    // La búsqueda bloquea la fila hasta el commit de la transacción.
    expect(busqueda(trx)[0]).toContain('FOR UPDATE OF u');
    // La confirmación solo aplica sobre entregas del bar sin confirmar antes.
    expect(marcaConfirmacion(trx)![0]).toContain('fecha_devolucion IS NOT NULL');
    expect(marcaConfirmacion(trx)![0]).toContain('fecha_confirmacion IS NULL');
    expect(marcaConfirmacion(trx)![1]).toEqual([expect.any(String), 'user-2', 'unidad-1']);
  });

  it('rechaza la recepción de un envase que el bar todavía no entregó', async () => {
    const trx = trxConfirm([envase()]);

    const resultado = await conContextoOperacionExistente(trx, contexto =>
      confirmarRecepcionEnvase('LM-000123', 'user-2', contexto)
    );

    expect(resultado).toMatchObject({ ok: false, motivo: 'no_entregado' });
    expect(marcaConfirmacion(trx)).toBeUndefined();
    expect(trx).toHaveBeenCalledTimes(1);
  });

  it('detecta la doble confirmación y trae la fecha anterior', async () => {
    const trx = trxConfirm([
      envase({
        fecha_devolucion: '2026-09-20 22:30:00',
        fecha_confirmacion: '2026-09-21 08:05:00'
      })
    ]);

    const resultado = await conContextoOperacionExistente(trx, contexto =>
      confirmarRecepcionEnvase('LM-000123', 'user-2', contexto)
    );

    expect(resultado).toMatchObject({ ok: false, motivo: 'ya_confirmado' });
    if (!resultado.ok && resultado.unidad) {
      expect(resultado.unidad.fecha_confirmacion).toBe('2026-09-21 08:05:00');
    }
    expect(marcaConfirmacion(trx)).toBeUndefined();
  });

  it('rechaza un código ajeno en la recepción sin escribir nada', async () => {
    const trx = trxConfirm([]);

    const resultado = await conContextoOperacionExistente(trx, contexto =>
      confirmarRecepcionEnvase('7800000000001', 'user-2', contexto)
    );

    expect(resultado).toMatchObject({ ok: false, motivo: 'no_es_nuestro', unidad: null });
    expect(trx).toHaveBeenCalledTimes(1);
  });

  it('exige un código para confirmar la recepción', async () => {
    const trx = trxConfirm([]);

    await expect(
      conContextoOperacionExistente(trx, contexto => confirmarRecepcionEnvase('  ', null, contexto))
    ).rejects.toThrow('código del envase');
    expect(trx).not.toHaveBeenCalled();
  });

  it('normaliza el escaneo de la recepción (espacios y minúsculas)', async () => {
    const trx = trxConfirm([envase({ fecha_devolucion: '2026-09-20 22:30:00' })]);

    await conContextoOperacionExistente(trx, contexto =>
      confirmarRecepcionEnvase('  lm-000123  ', 'user-2', contexto)
    );

    expect(trx.mock.calls[0][1]).toEqual(['LM-000123', 'LM-000123']);
  });

  it('la confirmación corre dentro de una transacción (wrapper público)', async () => {
    const trx = trxConfirm([envase({ fecha_devolucion: '2026-09-20 22:30:00' })]);
    (withTransaction as any).mockImplementationOnce(async (cb: any) => await cb(trx));

    const resultado = await confirmarRecepcionEnvase('LM-000123', 'user-2');

    expect(vi.mocked(withTransaction)).toHaveBeenCalledTimes(1);
    expect(resultado.ok).toBe(true);
  });
});

describe('reversión de stock por anulación de venta', () => {
  const entrada = {
    venta_id: 'venta-1',
    usuario_id: 'user-1',
    fecha: '2026-10-05 21:00:00'
  };

  function movimiento(over: Record<string, unknown> = {}) {
    return {
      id: 'mov-1',
      producto_id: 'prod-1',
      presentacion_id: 'pres-1',
      nombre: 'Whisky 750 ml',
      cantidad: 2,
      ml: null,
      precio_venta: 15000,
      comision: 1000,
      ml_botella: 750,
      unidades_revertidas: 0,
      ml_revertido: 0,
      ...over
    };
  }

  /** trx de mentira: responde por el texto del SQL y guarda lo que se escribe. */
  function trxAnulacion(respuestas: {
    movimientos?: unknown[];
    tocadas?: unknown[];
    vendidas?: unknown[];
  }) {
    return vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('FROM inventario_movimientos m')) return respuestas.movimientos ?? [];
      if (sql.includes('mu.ml_consumido > 0')) return respuestas.tocadas ?? [];
      if (sql.includes('mu.ml_consumido = 0')) return respuestas.vendidas ?? [];
      if (sql.includes('configuraciones')) return [];
      return [];
    });
  }

  const inserts = (trx: any): [string, any[]][] =>
    trx.mock.calls.filter(([sql]: [string]) => sql.includes('INSERT INTO')) as [string, any[]][];

  const escritura = (trx: any, fragmento: string): [string, any[]] =>
    trx.mock.calls.find(([sql]: [string]) => sql.includes(fragmento)) as [string, any[]];

  it('devuelve al bar las botellas que el consumo vendió enteras', async () => {
    const trx = trxAnulacion({
      movimientos: [movimiento()],
      vendidas: [{ id: 'unit-2' }, { id: 'unit-1' }]
    });

    const resultado = await conContextoOperacionExistente(trx, contexto =>
      revertirStockAnulacion(entrada, contexto)
    );

    expect(resultado).toMatchObject({ unidades_repuestas: 2, ml_repuesto: 0, ml_no_repuesto: 0 });
    const [, ids] = escritura(trx, 'ml_restante = 0');
    expect(ids).toEqual(['unit-2', 'unit-1']);
    const [columnas, valores] = inserts(trx)[0];
    expect(columnas).toContain('tipo');
    expect(columnas).toContain('movimiento_origen');
    expect(valores).toEqual([
      'uuid-test',
      'devolucion',
      'completada',
      'prod-1',
      'pres-1',
      2,
      null,
      15000,
      1000,
      'user-1',
      'venta-1',
      'mov-1',
      '2026-10-05 21:00:00'
    ]);
  });

  it('no devuelve dos veces lo que una anulación anterior ya repuso', async () => {
    const trx = trxAnulacion({ movimientos: [movimiento({ unidades_revertidas: 2 })] });

    const resultado = await conContextoOperacionExistente(trx, contexto =>
      revertirStockAnulacion(entrada, contexto)
    );

    expect(resultado.unidades_repuestas).toBe(0);
    expect(inserts(trx)).toHaveLength(0);
    expect(trx.mock.calls.every(([sql]) => String(sql).trim().startsWith('SELECT'))).toBe(true);
  });

  it('repone sólo la fracción de una anulación parcial y respeta lo ya devuelto', async () => {
    const trx = trxAnulacion({
      movimientos: [movimiento({ cantidad: 10, unidades_revertidas: 2 })],
      vendidas: [{ id: 'unit-3' }, { id: 'unit-4' }]
    });

    const resultado = await conContextoOperacionExistente(trx, contexto =>
      revertirStockAnulacion({ ...entrada, fraccion: 0.2 }, contexto)
    );

    // 10 * 20% son 2 botellas, que es lo que se devuelve en cada anulación del 20%,
    // aunque otra anterior ya hubiera devuelto otras 2 (quedan 8 en total por reponer).
    expect(resultado.unidades_repuestas).toBe(2);
    const [, ids] = escritura(trx, 'ml_restante = 0');
    expect(ids).toEqual(['unit-3', 'unit-4']);
  });

  it('vuelve a llenar las botellas de las que salieron los shots', async () => {
    const trx = trxAnulacion({
      movimientos: [movimiento({ cantidad: 0, ml: 200 })],
      tocadas: [
        { id: 'unit-1', ml_restante: 650, estado: 'almacen', ml_consumido: 100 },
        { id: 'unit-2', ml_restante: 650, estado: 'almacen', ml_consumido: 100 }
      ]
    });

    const resultado = await conContextoOperacionExistente(trx, contexto =>
      revertirStockAnulacion(entrada, contexto)
    );

    expect(resultado).toMatchObject({ ml_repuesto: 200, ml_no_repuesto: 0, unidades_repuestas: 0 });
    // Cada botella recupera los 100 ml que el consumo le sacó, empezando por la más vacía.
    expect(trx.mock.calls[3][1]).toEqual([750, 'unit-1']);
    expect(trx.mock.calls[4][1]).toEqual([750, 'unit-2']);
  });

  it('reabre una botella que el consumo vació por shots y la devuelve al bar', async () => {
    const trx = trxAnulacion({
      movimientos: [movimiento({ cantidad: 0, ml: 750 })],
      tocadas: [{ id: 'unit-1', ml_restante: 0, estado: 'vendida', ml_consumido: 750 }]
    });

    const resultado = await conContextoOperacionExistente(trx, contexto =>
      revertirStockAnulacion(entrada, contexto)
    );

    expect(resultado.ml_repuesto).toBe(750);
    const [sql, valores] = trx.mock.calls[3];
    expect(sql).toContain("estado = CASE WHEN estado = 'vendida'");
    expect(valores).toEqual([750, 'unit-1']);
  });

  it('reporta la ml que no cupo en las botellas en vez de inventarse otra', async () => {
    const trx = trxAnulacion({
      movimientos: [movimiento({ cantidad: 0, ml: 1500 })],
      tocadas: [{ id: 'unit-1', ml_restante: 0, estado: 'vendida', ml_consumido: 1500 }]
    });

    const resultado = await conContextoOperacionExistente(trx, contexto =>
      revertirStockAnulacion(entrada, contexto)
    );

    expect(resultado.ml_repuesto).toBe(750);
    expect(resultado.ml_no_repuesto).toBe(750);
  });

  it('no escribe nada cuando la venta no consumió stock', async () => {
    const trx = trxAnulacion({});

    const resultado = await conContextoOperacionExistente(trx, contexto =>
      revertirStockAnulacion(entrada, contexto)
    );

    expect(resultado).toMatchObject({ movimientos_revertidos: 0, unidades_repuestas: 0 });
    expect(trx).toHaveBeenCalledTimes(1);
  });

  it('no hace nada sin venta, sin fracción o sin transacción abierta', async () => {
    const trx = trxAnulacion({ movimientos: [movimiento()] });

    await expect(revertirStockAnulacion({ ...entrada, venta_id: '' })).resolves.toMatchObject({
      unidades_repuestas: 0
    });
    await expect(
      conContextoOperacionExistente(trx, contexto =>
        revertirStockAnulacion({ ...entrada, fraccion: 0 }, contexto)
      )
    ).resolves.toMatchObject({ unidades_repuestas: 0 });
    expect(trx).not.toHaveBeenCalled();
    expect(vi.mocked(withTransaction)).not.toHaveBeenCalled();
  });
});
