import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * La API de ventas no pasaba por la validación del carro: un producto de
 * champaña sin tabla de precios se registraba con el precio que mandara el
 * cliente. Ahora la unidad de venta lo bloquea antes de escribir nada.
 */

const trx = vi.hoisted(() => vi.fn());

vi.mock('@/lib/transaction/infrastructure', () => ({
  resolverTransaccion: () => trx
}));

import { validarChampanaConfigurada } from '@/modules/inventario/bar/validarChampana';
import { MENSAJE_CHAMPAGNE_SIN_CONFIGURAR } from '@/lib/business/champagne';

const contexto = { id: 'unidad-1' };

function configurar(escenario: {
  categoria?: string | null;
  maxAnfitrionas?: number | null;
  tiers?: Array<{ producto_id: string; anfitrionas: number }>;
}) {
  trx.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM productos'))
      return [
        {
          id_producto: 'prod-champ',
          max_anfitrionas: escenario.maxAnfitrionas ?? null,
          categoria: escenario.categoria === undefined ? 'Champagne' : escenario.categoria
        }
      ];
    if (sql.includes('FROM producto_champagne_tiers')) return escenario.tiers ?? [];
    return [];
  });
}

beforeEach(() => {
  trx.mockReset();
});

describe('validarChampanaConfigurada', () => {
  it('bloquea la champaña sin máximo ni tramos', async () => {
    configurar({});
    await expect(
      validarChampanaConfigurada([{ producto_id: 'prod-champ', tipo_venta: 'botella' }], contexto)
    ).rejects.toThrow(MENSAJE_CHAMPAGNE_SIN_CONFIGURAR);
  });

  it('acepta la champaña con tramos guardados', async () => {
    configurar({ tiers: [{ producto_id: 'prod-champ', anfitrionas: 1 }] });
    await expect(
      validarChampanaConfigurada([{ producto_id: 'prod-champ', tipo_venta: 'botella' }], contexto)
    ).resolves.toBeUndefined();
  });

  it('acepta la champaña con máximo explícito aunque no tenga tramos', async () => {
    configurar({ maxAnfitrionas: 3 });
    await expect(
      validarChampanaConfigurada([{ producto_id: 'prod-champ', tipo_venta: 'botella' }], contexto)
    ).resolves.toBeUndefined();
  });

  it('no mira la tabla de un shot: se sirve de la botella abierta', async () => {
    configurar({});
    await expect(
      validarChampanaConfigurada([{ producto_id: 'prod-champ', tipo_venta: 'shot' }], contexto)
    ).resolves.toBeUndefined();
  });

  it('deja pasar un producto que no es champaña', async () => {
    configurar({ categoria: 'Vodka' });
    await expect(
      validarChampanaConfigurada([{ producto_id: 'prod-champ', tipo_venta: 'botella' }], contexto)
    ).resolves.toBeUndefined();
  });

  it('no consulta la base si la venta no trae detalles', async () => {
    await expect(validarChampanaConfigurada([], contexto)).resolves.toBeUndefined();
    expect(trx).not.toHaveBeenCalled();
  });
});
