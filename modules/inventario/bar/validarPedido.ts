import type { TransactionQuery } from '@/lib/database/db';
import type { OrderCreateType } from '@/lib/business/schemas/order';
import { BusinessError } from '@/lib/errors/errors';
import {
  esCategoriaChampagne,
  faltaConfiguracionChampagne,
  MENSAJE_CHAMPAGNE_SIN_CONFIGURAR
} from '@/lib/business/champagne';
import { parseOpcionesVenta } from '../helpers';
import { preciosCortoAnfitriona } from '@/lib/sales/hostessShortPrices';
import { validarStockPedido } from './consumoRepositorio';
import { bloquearYValidarConfiguracionVenta } from './validarConfiguracionVenta';

/** Comprueba precios, comisiones y asignaciones antes de aceptar el pedido. */
export async function validarConfiguracionPedido(
  trx: TransactionQuery,
  detalles: OrderCreateType['detalles']
) {
  const presentations = await bloquearYValidarConfiguracionVenta(trx, detalles);
  const ids = [...new Set(detalles.map(d => d.productoId))];
  const products = await trx<any[]>(
    `SELECT P.id_producto, P.precio, P.comision, P.max_anfitrionas, P.estado, EXISTS (SELECT 1 FROM inventario_presentaciones IP WHERE IP.producto_id = P.id_producto) AS tiene_presentaciones, C.nombre AS categoria FROM productos P LEFT JOIN categorias C ON C.id_categoria = P.categoria_id WHERE P.id_producto IN (${ids.map(() => '?').join(',')})`,
    ids
  );
  const tiers = await trx<any[]>(
    `SELECT producto_id, anfitrionas, precio, comision FROM producto_champagne_tiers WHERE producto_id IN (${ids.map(() => '?').join(',')})`,
    ids
  );
  const drinkHosts = new Set<string>();
  const champagneHosts = new Set<string>();
  for (const d of detalles) {
    const product = products.find(p => String(p.id_producto) === d.productoId);
    if (!product || Number(product.estado) === 0)
      throw new BusinessError('El producto del pedido no esta disponible');
    if (!d.presentacion_id && product.tiene_presentaciones)
      throw new BusinessError('Selecciona la presentacion del producto para comprobar el stock');
    const presentation = d.presentacion_id ? presentations.get(d.presentacion_id) : undefined;
    if (d.presentacion_id && (!presentation || presentation.producto_id !== d.productoId))
      throw new BusinessError('La presentacion no pertenece al producto');
    const options = parseOpcionesVenta(presentation?.opciones_venta) ?? [];
    const hosts = [
      ...new Set([...(d.selectedHostesses || []), ...(d.hostessId ? [d.hostessId] : [])])
    ];
    let prices: { precio: number; comision: number }[];
    if (d.tipo_venta === 'shot') {
      const shot = options.find(o => o.tipo === 'shot');
      prices = d.shot_anfitriona
        ? preciosCortoAnfitriona(shot)
        : shot
          ? [{ precio: shot.precio, comision: 0 }]
          : [];
    } else {
      const bottle = options.find(o => o.tipo === 'botella');
      const tier = tiers.find(
        t => t.producto_id === d.productoId && Number(t.anfitrionas) === hosts.length
      );
      prices = [
        tier && hosts.length
          ? tier
          : {
              precio: Number(bottle?.precio ?? presentation?.precio_venta ?? product.precio),
              comision: Number(bottle?.comision ?? presentation?.comision ?? product.comision)
            }
      ];
    }
    const price = prices.find(
      p => Number(p.precio) === d.precio && Number(p.comision) * d.cantidad === d.comision
    );
    if (!price)
      throw new BusinessError('El precio o la comision no coincide con el formato seleccionado');
    if (Number(price.comision) > 0 && (!hosts.length || d.generaComision !== 1))
      throw new BusinessError('Selecciona anfitriona para cada producto con comision');
    if (Number(price.comision) === 0 && hosts.length)
      throw new BusinessError('Un producto sin comision no admite anfitriona');
    const champagne = d.tipo_venta !== 'shot' && esCategoriaChampagne(product.categoria);
    const productTiers = tiers.filter(t => t.producto_id === d.productoId);
    if (champagne && faltaConfiguracionChampagne(product.max_anfitrionas, productTiers))
      throw new BusinessError(MENSAJE_CHAMPAGNE_SIN_CONFIGURAR);
    const limit =
      d.tipo_venta === 'shot'
        ? d.cantidad
        : Number(product.max_anfitrionas) > 0
          ? Number(product.max_anfitrionas)
          : champagne
            ? Math.max(1, ...productTiers.map(t => Number(t.anfitrionas)))
            : Math.max(1, d.cantidad, ...productTiers.map(t => Number(t.anfitrionas)));
    if (hosts.length > limit)
      throw new BusinessError('El producto excede el maximo de anfitrionas');
    for (const id of hosts) {
      if (
        (champagne && drinkHosts.has(id)) ||
        (!champagne && (drinkHosts.has(id) || champagneHosts.has(id)))
      )
        throw new BusinessError(
          'Cada bebida debe tener anfitrionas unicas; no pueden repetirse con champanas'
        );
      (champagne ? champagneHosts : drinkHosts).add(id);
    }
  }
  await validarStockPedido(trx, detalles);
}
