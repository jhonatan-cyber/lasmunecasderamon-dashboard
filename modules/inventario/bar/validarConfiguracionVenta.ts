import type { TransactionQuery } from '@/lib/database/db';
import { BusinessError } from '@/lib/errors/errors';
import { parseOpcionesVenta } from '../helpers';
import type { ConsumoInventarioDetalle } from '../contracts';

/** Datos inmutables mientras esta transacciÃ³n conserva el bloqueo de la presentaciÃ³n. */
export interface PresentacionVentaBloqueada {
  id: string;
  producto_id: string;
  nombre: string;
  precio_venta: number;
  comision: number;
  ml_botella: number | null;
  opciones_venta: unknown;
  /** Estado del producto: 0 = desactivado, no se puede sacar del bar. */
  estado: number | null;
}

/** Un producto desactivado a mano no se vende ni se consume del bar. */
export const productoDesactivado = (estado: number | null | undefined) => estado === 0;

/** Solo reutilizable dentro de la misma transacciÃ³n que adquiriÃ³ estos bloqueos. */
export async function bloquearYValidarConfiguracionVenta(
  trx: TransactionQuery,
  detalles: ConsumoInventarioDetalle[]
): Promise<Map<string, PresentacionVentaBloqueada>> {
  const ids = [
    ...new Set(detalles.map(d => d.presentacion_id).filter((id): id is string => Boolean(id)))
  ];
  if (!ids.length) return new Map();
  const rows = await trx<PresentacionVentaBloqueada[]>(
    // El estado del producto entra como subconsulta y no como `JOIN`: el
    // `FROM` y el `FOR UPDATE` quedan exactamente como estaban, así que esta
    // consulta sigue bloqueando las mismas filas y en el mismo orden.
    `SELECT id, opciones_venta, producto_id, nombre, precio_venta, comision, ml_botella,
            (SELECT pr.estado FROM productos pr WHERE pr.id_producto = inventario_presentaciones.producto_id) AS estado
       FROM inventario_presentaciones
      WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY id FOR UPDATE`,
    ids
  );
  const configs = new Map(rows.map(row => [row.id, parseOpcionesVenta(row.opciones_venta)]));
  for (const detalle of detalles) {
    if (!detalle.presentacion_id) continue;
    // Un producto desactivado a mano no se saca del bar: ni la bebida ni su
    // acompaÃ±amiento. Se comprueba antes de validar el formato de la venta.
    for (const presentacionId of [
      detalle.presentacion_id,
      detalle.acompanamiento_botella?.presentacion_id,
      detalle.acompanamiento_corto?.presentacion_id
    ]) {
      if (!presentacionId) continue;
      const presentacion = rows.find(row => row.id === presentacionId);
      if (presentacion && productoDesactivado(presentacion.estado))
        throw new BusinessError('La bebida seleccionada no está disponible');
    }
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
          'La bebida de botella no coincide con la configuraciÃ³n del producto'
        );
    }
  }
  return new Map(rows.map(row => [row.id, row]));
}

/** Validate against persisted presentation settings, including callers from Expo. */
export async function validarConfiguracionVenta(
  trx: TransactionQuery,
  detalles: ConsumoInventarioDetalle[]
): Promise<void> {
  await bloquearYValidarConfiguracionVenta(trx, detalles);
}
