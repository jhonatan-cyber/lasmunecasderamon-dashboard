import type { TransactionQuery } from '@/lib/database/db';
import { BusinessError } from '@/lib/errors/errors';
import { normalizarAcompanamientoBotella } from '@/lib/sales/acompanamientoBotella';
import { parseOpcionesVenta } from '../helpers';
import type { ConsumoInventarioDetalle } from '../contracts';
export interface PresentacionVentaBloqueada {
  id: string;
  producto_id: string;
  nombre: string;
  precio_venta: number;
  comision: number;
  ml_botella: number | null;
  opciones_venta: unknown;
  estado: number | null;

  fecha_vencimiento: string | null;
}

export const productoDesactivado = (estado: number | null | undefined) => estado === 0;

export async function bloquearYValidarConfiguracionVenta(
  trx: TransactionQuery,
  detalles: ConsumoInventarioDetalle[]
): Promise<Map<string, PresentacionVentaBloqueada>> {
  const ids = [
    ...new Set(detalles.map(d => d.presentacion_id).filter((id): id is string => Boolean(id)))
  ];
  if (!ids.length) return new Map();
  const rows = await trx<PresentacionVentaBloqueada[]>(
    `SELECT id, opciones_venta, producto_id, nombre, precio_venta, comision, ml_botella,
            fecha_vencimiento,
            (SELECT pr.estado FROM productos pr WHERE pr.id_producto = inventario_presentaciones.producto_id) AS estado
       FROM inventario_presentaciones
      WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY id FOR UPDATE`,
    ids
  );
  const configs = new Map(rows.map(row => [row.id, parseOpcionesVenta(row.opciones_venta)]));
  for (const detalle of detalles) {
    if (!detalle.presentacion_id) continue;
    const saboresBotella = normalizarAcompanamientoBotella(detalle.acompanamiento_botella);
    for (const presentacionId of [
      detalle.presentacion_id,
      ...saboresBotella.map(sabor => sabor.presentacion_id),
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
      const shotOption = options.find(o => o.tipo === 'shot');
      if (detalle.shot_anfitriona) {
        const ml = shotOption?.ml_acompanamiento_anfitriona ?? 0;
        if (ml <= 0 || mixer.unidades !== undefined || mixer.ml_por_corto !== ml)
          throw new BusinessError(
            'El corto anfitriona debe descontar los ml configurados de bebida'
          );
      } else if (shotOption?.acompanamiento_cliente === false) {
        throw new BusinessError('El corto al cliente de esta bebida no lleva acompañamiento');
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
      const unidadesBotella = saboresBotella.reduce((sum, sabor) => sum + sabor.unidades, 0);
      if ((units > 0 && unidadesBotella !== units) || (units === 0 && saboresBotella.length > 0))
        throw new BusinessError(
          'La bebida de botella no coincide con la configuraciÃ³n del producto'
        );
    }
  }
  return new Map(rows.map(row => [row.id, row]));
}

export async function validarConfiguracionVenta(
  trx: TransactionQuery,
  detalles: ConsumoInventarioDetalle[]
): Promise<void> {
  await bloquearYValidarConfiguracionVenta(trx, detalles);
}
