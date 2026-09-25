import { describe, it, expect, vi } from 'vitest';
import {
  ean13CheckDigit,
  generarEan13Interno,
  InventoryRepository
} from '@/lib/repositories/InventoryRepository';
import { query, withTransaction } from '@/lib/database/db';

vi.mock('@/lib/database/db', () => ({
  query: vi.fn(),
  generateUUID: () => 'uuid-test',
  withTransaction: vi.fn()
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
    await expect(InventoryRepository.traspasarAlBar(trx, input)).rejects.toThrow(
      'Stock insuficiente'
    );
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
    const result = await InventoryRepository.traspasarAlBar(trx, {
      ...input,
      opciones_venta: options
    });
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
    const rows = await InventoryRepository.listBarStock();
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
    const rows = await InventoryRepository.listBarStock();
    expect(rows[0].opciones_venta).toEqual([{ tipo: 'botella', precio: 15000, comision: 1500 }]);
  });

  it('respeta el 0 cuando no hay nada configurado en ningún nivel', async () => {
    mockBar({ ...baseRow, precio_venta: 0, comision: 0, opciones_venta: null });
    const rows = await InventoryRepository.listBarStock();
    expect(rows[0].opciones_venta).toEqual([{ tipo: 'botella', precio: 0, comision: 0 }]);
  });

  it('anula la comisión en venta simple aunque venga configurada (tope 10000)', async () => {
    mockBar({
      ...baseRow,
      precio_venta: 8000,
      comision: 3000,
      opciones_venta: [{ tipo: 'botella', precio: 8000, comision: 3000 }]
    });
    const rows = await InventoryRepository.listBarStock();
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
    const rows = await InventoryRepository.listBarStock();
    expect(rows[0].opciones_venta).toEqual([
      { tipo: 'botella', precio: 8000, comision: 0 },
      { tipo: 'shot', precio: 3000, comision: 200 }
    ]);
  });
});

describe('listTransfers historial', () => {
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
    const rows = await InventoryRepository.listTransfers();
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
    expect(await InventoryRepository.markUnitsPrinted(['unit-1'])).toEqual(saved);
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
    const rows = await InventoryRepository.listBarStock('prod-1');
    expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE p.producto_id = ?'), [
      'prod-1'
    ]);
    expect(rows[0].opciones_venta).toEqual([{ tipo: 'botella', precio: 25000, comision: 5000 }]);
  });

  it('rechaza un lote incompleto antes de marcar ninguna unidad', async () => {
    const trx = vi.fn().mockResolvedValueOnce([]);
    vi.mocked(withTransaction).mockImplementationOnce(async callback => callback(trx));
    await expect(InventoryRepository.markUnitsPrinted(['missing'])).rejects.toThrow(
      'ya no existen'
    );
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

    const codes = await InventoryRepository.generateUnits(trx, 'prod-1', 2, 'pres-1', 'comp-2');
    await InventoryRepository.syncStockTotal(trx, 'prod-1');

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
    comision: 5000
  };

  function trxCon(disponibles: { id: string }[]) {
    return vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('FROM inventario_presentaciones')) return [presentacion];
      if (sql.includes('SELECT id FROM inventario_unidades')) return disponibles;
      return [];
    });
  }

  it('ignora los detalles sin presentación: el catálogo anterior no tiene inventario', async () => {
    const trx = vi.fn();

    await InventoryRepository.consume(
      trx,
      [{ presentacion_id: null, cantidad: 3 }, { cantidad: 1 }],
      contexto
    );

    expect(trx).not.toHaveBeenCalled();
  });

  it('suma las cantidades de la misma presentación en un solo descuento', async () => {
    const trx = trxCon([{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }]);

    await InventoryRepository.consume(
      trx,
      [
        { presentacion_id: 'pres-1', cantidad: 2 },
        { presentacion_id: 'pres-1', cantidad: 1 }
      ],
      contexto
    );

    const seleccion = trx.mock.calls.find(([sql]) =>
      sql.includes('SELECT id FROM inventario_unidades')
    );
    expect(seleccion![0]).toContain('LIMIT ?');
    expect(seleccion![1]).toEqual(['pres-1', 3]);
  });

  it('bloquea la presentación, marca las unidades como vendidas y registra el movimiento', async () => {
    const trx = trxCon([{ id: 'u1' }, { id: 'u2' }]);

    await InventoryRepository.consume(trx, [{ presentacion_id: 'pres-1', cantidad: 2 }], contexto);

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

  it('rechaza la venta sin modificar nada cuando no alcanzan las botellas', async () => {
    const trx = trxCon([{ id: 'u1' }]);

    await expect(
      InventoryRepository.consume(trx, [{ presentacion_id: 'pres-1', cantidad: 2 }], contexto)
    ).rejects.toMatchObject({
      code: 'INSUFFICIENT_BAR_STOCK',
      details: { presentacion_id: 'pres-1', disponibles: 1, requeridas: 2 }
    });

    expect(trx.mock.calls.every(([sql]) => sql.trim().startsWith('SELECT'))).toBe(true);
  });

  it('sin unidades en el bar también rechaza, en lugar de vender humo', async () => {
    const trx = trxCon([]);

    await expect(
      InventoryRepository.consume(trx, [{ presentacion_id: 'pres-1', cantidad: 1 }], contexto)
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_BAR_STOCK' });
    expect(trx).toHaveBeenCalledTimes(2);
  });

  it('no falla si la presentación ya no existe (unidades huérfanas)', async () => {
    const trx = vi.fn().mockResolvedValue([]);

    await expect(
      InventoryRepository.consume(trx, [{ presentacion_id: 'pres-1', cantidad: 1 }], contexto)
    ).resolves.toBeUndefined();
    expect(trx).toHaveBeenCalledTimes(1);
  });
});
