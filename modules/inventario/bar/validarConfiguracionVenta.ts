import type { TransactionQuery } from '@/lib/database/db';
import { BusinessError } from '@/lib/errors/errors';
import { parseOpcionesVenta } from '../helpers';
import type { ConsumoInventarioDetalle } from '../contracts';

/** Validate against persisted presentation settings, including callers from Expo. */
export async function validarConfiguracionVenta(
  trx: TransactionQuery,
  detalles: ConsumoInventarioDetalle[]
): Promise<void> {
  const ids = [
    ...new Set(detalles.map(d => d.presentacion_id).filter((id): id is string => Boolean(id)))
  ];
  if (!ids.length) return;
  const rows = await trx<{ id: string; opciones_venta: unknown }[]>(
    `SELECT id, opciones_venta FROM inventario_presentaciones WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY id FOR UPDATE`,
    ids
  );
  const configs = new Map(rows.map(row => [row.id, parseOpcionesVenta(row.opciones_venta)]));
  for (const detalle of detalles) {
    if (!detalle.presentacion_id) continue;
    const options = configs.get(detalle.presentacion_id) ?? [];
    if (detalle.tipo_venta === 'shot' && detalle.acompanamiento_corto) {
      const mixer = detalle.acompanamiento_corto;
      if (detalle.shot_anfitriona) {
        const ml = options.find(o => o.tipo === 'shot')?.ml_acompanamiento_anfitriona ?? 0;
        if (ml <= 0 || mixer.unidades !== undefined || mixer.ml_por_corto !== ml)
          throw new BusinessError(
            'El corto anfitriona debe descontar los ml configurados de bebida'
          );
      } else if (mixer.unidades !== 1 || mixer.ml_por_corto !== undefined) {
        throw new BusinessError('El corto cliente debe descontar una unidad completa de bebida');
      }
    }
    if (!options.length) continue;
    const option = options.find(
      o => o.tipo === (detalle.tipo_venta === 'shot' ? 'shot' : 'botella')
    );
    if (!option)
      throw new BusinessError('El formato de venta no está habilitado para este producto');
    if (detalle.tipo_venta === 'shot') {
      if (!detalle.shot_anfitriona && Number(option.precio) <= 0)
        throw new BusinessError('La venta de corto al cliente no está configurada');
      if (detalle.shot_anfitriona && option.ml_acompanamiento_anfitriona !== undefined) {
        const ml = option.ml_acompanamiento_anfitriona;
        if (ml > 0 && detalle.acompanamiento_corto?.ml_por_corto !== ml)
          throw new BusinessError(
            'Los ml de acompa\u00f1amiento deben coincidir con la configuraci\u00f3n de anfitriona'
          );
        if (ml === 0 && detalle.acompanamiento_corto)
          throw new BusinessError('Configura los ml de bebida para corto anfitriona');
      }
      if (
        detalle.acompanamiento_corto?.unidades !== undefined &&
        detalle.acompanamiento_corto.unidades !== 1
      )
        throw new BusinessError('Selecciona una unidad completa de acompa\u00f1amiento por corto');
    } else {
      const units = option.acompanamiento?.unidades ?? 0;
      if (
        (units > 0 &&
          (!detalle.acompanamiento_botella || detalle.acompanamiento_botella.unidades !== units)) ||
        (units === 0 && detalle.acompanamiento_botella)
      )
        throw new BusinessError(
          'La bebida de botella no coincide con la configuración del producto'
        );
    }
  }
}
