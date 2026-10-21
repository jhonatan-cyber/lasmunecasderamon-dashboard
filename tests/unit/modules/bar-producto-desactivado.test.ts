import { describe, expect, it, vi } from 'vitest';
import { conContextoOperacionExistente } from '@/tests/setup/contexto-operacion';
import { consumirStockBar } from '@/modules/inventario';
import { bloquearYValidarConfiguracionVenta } from '@/modules/inventario/bar/validarConfiguracionVenta';

/**
 * Un producto desactivado a mano no sale del bar: ni en la venta por corto, ni
 * en la venta por botella, ni en el cover, ni en la cortesía.
 *
 * La comprobación vive donde ya se bloquea la presentación, así que el bloqueo
 * sigue siendo sobre las mismas filas y en el mismo orden.
 */

const BOTELLA = {
  id: 'pres-1',
  producto_id: 'prod-1',
  nombre: 'Whisky 750 ml',
  precio_venta: 45000,
  comision: 5000,
  ml_botella: 750,
  opciones_venta: [{ tipo: 'botella', precio: 45000, comision: 5000 }],
  estado: 1
};

const contextoVenta = { usuarioId: 'user-1', fecha: '2026-09-24 10:00:00' };

/** Consume dentro de una unidad de trabajo ya abierta. */
const consumir = (trx: any, detalles: any[]) =>
  conContextoOperacionExistente(trx, operacion =>
    consumirStockBar(detalles, contextoVenta, operacion)
  );

/**
 * Fake que responde por consulta: la validación por lote termina en
 * `ORDER BY id FOR UPDATE` y la lectura individual busca `WHERE p.id = ?`.
 */
function trxCon(presentaciones: Record<string, unknown>[]) {
  return vi.fn().mockImplementation(async (sql: string) => {
    if (sql.includes('FROM inventario_presentaciones')) return presentaciones;
    if (sql.includes('FROM inventario_unidades')) return [{ id: 'u1', ml_restante: null }];
    return [];
  });
}

const movimientos = (trx: any) =>
  trx.mock.calls.filter(([sql]: string[]) => sql.includes('INSERT INTO inventario_movimientos'));

describe('un producto desactivado no se consume del bar', () => {
  it('la validación por lote rechaza la venta', async () => {
    const trx = trxCon([{ ...BOTELLA, estado: 0 }]);

    await expect(
      conContextoOperacionExistente(trx, operacion =>
        bloquearYValidarConfiguracionVenta(trx, [{ presentacion_id: 'pres-1', cantidad: 1 }])
      )
    ).rejects.toThrow('La bebida seleccionada no está disponible');
  });

  it('la venta por botella se rechaza y no registra movimientos', async () => {
    const trx = trxCon([{ ...BOTELLA, estado: 0 }]);

    await expect(consumir(trx, [{ presentacion_id: 'pres-1', cantidad: 1 }])).rejects.toThrow(
      'La bebida seleccionada no está disponible'
    );

    expect(movimientos(trx)).toHaveLength(0);
  });

  it('la venta por corto se rechaza cuando el producto está desactivado', async () => {
    // La validación por lote ve el producto activo; la lectura del corto es la
    // que descubre que ya no se puede vender.
    const conCorto = {
      ...BOTELLA,
      opciones_venta: [{ tipo: 'shot', precio: 45000, comision: 5000 }]
    };
    const trx = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('ORDER BY id FOR UPDATE')) return [{ ...conCorto, estado: 1 }];
      if (sql.includes('WHERE p.id = ?'))
        return [{ ...conCorto, estado: 0, ml_shot: 50, ml_shot_anfitriona: 25 }];
      if (sql.includes('FROM inventario_unidades')) return [{ id: 'u1', ml_restante: null }];
      return [];
    });

    await expect(
      consumir(trx, [{ presentacion_id: 'pres-1', cantidad: 1, tipo_venta: 'shot' }])
    ).rejects.toThrow('La bebida seleccionada no esta disponible');

    expect(movimientos(trx)).toHaveLength(0);
  });

  it('un producto activo se sigue vendiendo', async () => {
    const trx = trxCon([{ ...BOTELLA, estado: 1 }]);

    await expect(
      consumir(trx, [{ presentacion_id: 'pres-1', cantidad: 1 }])
    ).resolves.toBeDefined();
  });

  it('el bloqueo sigue siendo sobre la presentación, en orden de id', async () => {
    const trx = trxCon([{ ...BOTELLA, estado: 1 }]);

    await consumir(trx, [{ presentacion_id: 'pres-1', cantidad: 1 }]);

    const bloqueo = trx.mock.calls.find(([sql]: string[]) => sql.includes('FOR UPDATE'));
    expect(bloqueo).toBeDefined();
    // Solo se bloquean las presentaciones, no los productos.
    expect(bloqueo![0]).toContain('ORDER BY id FOR UPDATE');
    expect(bloqueo![0]).not.toMatch(/FOR UPDATE OF p, pr/);
  });
});
