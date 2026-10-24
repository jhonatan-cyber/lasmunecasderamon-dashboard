import type { ContextoOperacion } from '@/lib/transaction/contract';
import { BusinessError } from '@/lib/errors/errors';
import {
  esCategoriaChampagne,
  faltaConfiguracionChampagne,
  MENSAJE_CHAMPAGNE_SIN_CONFIGURAR
} from '@/lib/business/champagne';
import { leerConfiguracionChampana } from './repositorio';

/** Lo mínimo del detalle de venta que hace falta para validar la champaña. */
export interface DetalleVentaChampana {
  producto_id: string;
  tipo_venta?: 'botella' | 'shot';
}

/**
 * Bloquea la venta de una champaña sin configuración.
 *
 * La tabla de precios vive por producto (`producto_champagne_tiers`) y el carro
 * la exige en la UI, pero la API de ventas se podía llamar sin pasar por ahí y
 * registraba la champaña al precio que mandara el cliente. Sin máximo explícito
 * ni tramos no hay precio por cantidad de anfitrionas que aplicar.
 */
export async function validarChampanaConfigurada(
  detalles: DetalleVentaChampana[],
  contexto: ContextoOperacion
): Promise<void> {
  const ids = [...new Set(detalles.map(d => d.producto_id).filter(Boolean))];
  if (ids.length === 0) return;

  const configuracion = await leerConfiguracionChampana(ids, contexto);
  for (const detalle of detalles) {
    // Un shot se sirve de la botella abierta: no lleva tabla de anfitrionas.
    if (detalle.tipo_venta === 'shot') continue;
    const producto = configuracion.find(p => p.productoId === String(detalle.producto_id));
    if (!producto || !esCategoriaChampagne(producto.categoria)) continue;
    if (faltaConfiguracionChampagne(producto.maxAnfitrionas, producto.tiers))
      throw new BusinessError(MENSAJE_CHAMPAGNE_SIN_CONFIGURAR);
  }
}
