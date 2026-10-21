import { describe, expect, it } from 'vitest';
import { parseOpcionesVenta } from '@/modules/inventario/helpers';
import { parseSavedOptions } from '@/components/bar/transfer/transferOptions';
import { copiarOpcionesDeBotella } from '@/lib/business/saleOptions';
import type { SaleOption } from '@/types/sale-options';

/**
 * Los flags de colación y de cover tienen una sola regla, en
 * `lib/business/saleOptions`. El cliente y el servidor la comparten: el
 * catálogo que la UI ofrece sale del servidor, así que dos copias de la regla
 * se traduce en "la UI ofrece una bebida que el servidor no acepta".
 */

const crudo = {
  tipo: 'botella',
  precio: 30000,
  comision: 0,
  colacion_habilitada: true,
  cover_habilitado: true,
  ml_colacion: 150,
  acompanamiento_colacion: { unidades: 2, ml: 90 }
};

describe('copiarOpcionesDeBotella', () => {
  it('copia los flags de colación y de cover', () => {
    const option: SaleOption = { tipo: 'botella', precio: 0, comision: 0 };
    copiarOpcionesDeBotella(option, crudo);
    expect(option).toMatchObject({
      colacion_habilitada: true,
      cover_habilitado: true,
      ml_colacion: 150,
      acompanamiento_colacion: { unidades: 2, ml: 90 }
    });
  });

  it('descarta los ml de colación fuera de rango', () => {
    const option: SaleOption = { tipo: 'botella', precio: 0, comision: 0 };
    copiarOpcionesDeBotella(option, { ...crudo, ml_colacion: 10001 });
    expect(option.ml_colacion).toBeUndefined();
  });

  it('descarta las unidades de Acompañamiento fuera de rango', () => {
    const option: SaleOption = { tipo: 'botella', precio: 0, comision: 0 };
    copiarOpcionesDeBotella(option, {
      ...crudo,
      acompanamiento_colacion: { unidades: 1001, ml: 90 }
    });
    expect(option.acompanamiento_colacion).toBeUndefined();
  });

  it('no toca una opción que no es de botella', () => {
    const option: SaleOption = { tipo: 'shot', precio: 0, comision: 0 };
    copiarOpcionesDeBotella(option, crudo);
    expect(option.colacion_habilitada).toBeUndefined();
    expect(option.ml_colacion).toBeUndefined();
  });
});

describe('el cliente y el servidor leen las opciones igual', () => {
  it('normalizan la misma configuración de botella al mismo valor', () => {
    const servidor = parseOpcionesVenta([crudo]);
    const cliente = parseSavedOptions([crudo]);
    expect(cliente).toEqual(servidor);
  });

  it('descartan los mismos valores corruptos', () => {
    const corrupto = { ...crudo, ml_colacion: 0, acompanamiento_colacion: { unidades: -1 } };
    const servidor = parseOpcionesVenta([corrupto]);
    const cliente = parseSavedOptions([corrupto]);
    expect(cliente).toEqual(servidor);
    expect(servidor?.[0].ml_colacion).toBeUndefined();
    expect(servidor?.[0].acompanamiento_colacion).toBeUndefined();
  });
});
