import { parseSavedOptions } from '@/components/bar/transfer/transferOptions';
import {
  normalizarAcompanamientoBotella,
  type AcompanamientoBotella
} from './acompanamientoBotella';

/**
 * Precio unitario del producto que se elige como acompañamiento (una botella o
 * gaseosa). Manda el precio de la opción de botella; si está en 0 se prueba el
 * precio sin anfitriona y los precios de la presentación/producto del bar,
 * porque las bebidas de cover suelen guardar la opción en 0.
 */
export function precioUnitarioAcompanamiento(choice: unknown): number {
  const producto = choice as {
    opciones_venta?: unknown;
    precio_venta?: unknown;
    precio?: unknown;
    producto_precio?: unknown;
  };
  const botella = (parseSavedOptions(producto?.opciones_venta) ?? []).find(
    opcion => opcion.tipo === 'botella'
  );
  const candidatos = [
    botella?.precio,
    botella?.precio_sin_anfitriona,
    producto?.precio_venta,
    producto?.precio,
    producto?.producto_precio
  ];
  for (const candidato of candidatos) {
    const precio = Number(candidato);
    if (Number.isFinite(precio) && precio > 0) return Math.round(precio);
  }
  return 0;
}

export interface RecargoAcompanamientoInput {
  tope: number;
  tipoVenta?: 'botella' | 'shot' | string | null;
  acompanamiento_botella?: AcompanamientoBotella | null;
  acompanamiento_corto?: {
    precio?: number;
    unidades?: number;
    ml_por_corto?: number;
  } | null;
}

const excesoPorUnidad = (precio: unknown, tope: number): number => {
  const valor = Number(precio);
  return Number.isFinite(valor) ? Math.max(0, Math.round(valor) - tope) : 0;
};

/**
 * Recargo que suma una unidad vendida del producto por su acompañamiento: el
 * exceso sobre el tope, multiplicado por las unidades de acompañamiento.
 *
 * Los cortos de anfitriona consumen ml de la botella y no llevan recargo; los
 * cortos de cliente y las unidades de botella (repartidas entre sabores) sí.
 * `tope <= 0` desactiva la regla.
 */
export function recargoAcompanamientoPorUnidad({
  tope,
  tipoVenta,
  acompanamiento_botella,
  acompanamiento_corto
}: RecargoAcompanamientoInput): number {
  const limite = Math.round(Number(tope));
  if (!Number.isFinite(limite) || limite <= 0) return 0;

  if (tipoVenta === 'shot') {
    if (!acompanamiento_corto || acompanamiento_corto.ml_por_corto !== undefined) return 0;
    const unidades = Math.max(0, Math.floor(Number(acompanamiento_corto.unidades ?? 1)));
    return excesoPorUnidad(acompanamiento_corto.precio, limite) * unidades;
  }

  return normalizarAcompanamientoBotella(acompanamiento_botella).reduce(
    (suma, item) => suma + excesoPorUnidad(item.precio, limite) * item.unidades,
    0
  );
}

/** Recargo por unidad del producto tal como se armó en el modal o el carrito. */
export function recargoAcompanamientoDeProducto(producto: unknown, tope: number): number {
  const linea = producto as {
    tipo_venta?: string | null;
    acompanamiento_botella?: AcompanamientoBotella | null;
    acompanamiento_corto?: RecargoAcompanamientoInput['acompanamiento_corto'];
  };
  return recargoAcompanamientoPorUnidad({
    tope,
    tipoVenta: linea?.tipo_venta,
    acompanamiento_botella: linea?.acompanamiento_botella,
    acompanamiento_corto: linea?.acompanamiento_corto
  });
}
