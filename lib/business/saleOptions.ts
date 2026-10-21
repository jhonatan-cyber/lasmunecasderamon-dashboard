import type { SaleOption } from '@/types/sale-options';

/**
 * Reglas de las opciones de venta que el cliente y el servidor tienen que
 * aplicar igual: los flags de botella que gobiernan la colación y el cover, los
 * ml de la colación y su Acompañamiento.
 *
 * Estaban duplicadas en `modules/inventario/helpers.ts` (servidor) y
 * `components/bar/transfer/transferOptions.ts` (cliente). Dos copias de la
 * misma regla divergen sin que nada lo note: el servidor alimenta el catálogo
 * que la UI muestra, así que cualquier diferencia se traduce en "la UI ofrece
 * una bebida que el servidor no acepta" o al revés.
 */

/** Rango de ml que se acepta como ml de colación. */
export const ML_COLACION_MINIMO = 1;
export const ML_COLACION_MAXIMO = 10000;
/** Rango de unidades de Acompañamiento que se acepta. */
export const UNIDADES_ACOMPANAMIENTO_MINIMO = 0;
export const UNIDADES_ACOMPANAMIENTO_MAXIMO = 1000;

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

/**
 * Copia a la opción normalizada los datos de botella que el servidor y el
 * cliente leen igual. Los valores fuera de rango se descartan: una
 * configuración corrupta no puede habilitar una colación.
 */
export function copiarOpcionesDeBotella(option: SaleOption, origen: unknown): void {
  if (option.tipo !== 'botella' || !esRegistro(origen)) return;

  if (typeof origen.colacion_habilitada === 'boolean') {
    option.colacion_habilitada = origen.colacion_habilitada;
  }
  if (typeof origen.cover_habilitado === 'boolean') {
    option.cover_habilitado = origen.cover_habilitado;
  }

  if (origen.ml_colacion !== undefined && origen.ml_colacion !== null) {
    const ml = Number(origen.ml_colacion);
    if (Number.isInteger(ml) && ml >= ML_COLACION_MINIMO && ml <= ML_COLACION_MAXIMO) {
      option.ml_colacion = ml;
    }
  }

  if (esRegistro(origen.acompanamiento_colacion)) {
    const unidades = Number(origen.acompanamiento_colacion.unidades);
    const ml = Number(origen.acompanamiento_colacion.ml);
    if (
      Number.isInteger(unidades) &&
      unidades >= UNIDADES_ACOMPANAMIENTO_MINIMO &&
      unidades <= UNIDADES_ACOMPANAMIENTO_MAXIMO
    ) {
      option.acompanamiento_colacion = {
        unidades,
        ...(Number.isInteger(ml) && ml >= ML_COLACION_MINIMO && ml <= ML_COLACION_MAXIMO
          ? { ml }
          : {})
      };
    }
  }
}
