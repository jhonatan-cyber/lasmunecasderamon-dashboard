import type { TransactionQuery } from '@/lib/database/db';
import { BusinessError } from '@/lib/errors/errors';
import { normalizarAcompanamientoBotella } from '@/lib/sales/acompanamientoBotella';
import { parseOpcionesVenta } from '../helpers';
import type {
  ConsumoInventarioDetalle,
  DetallePrecioInventario,
  PrecioInventarioValidado
} from '../contracts';
import {
  esCategoriaChampagne,
  faltaConfiguracionChampagne,
  MENSAJE_CHAMPAGNE_SIN_CONFIGURAR
} from '@/lib/business/champagne';
import { preciosCortoAnfitriona } from '@/lib/sales/hostessShortPrices';
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

interface ProductoPrecio {
  id_producto: string;
  precio: number;
  comision: number;
  max_anfitrionas: number | null;
  estado: number;
  tiene_presentaciones: boolean;
  categoria: string | null;
}

interface TramoPrecio {
  producto_id: string;
  anfitrionas: number;
  precio: number;
  comision: number;
}

export interface OpcionesPreciosVenta {
  /** Los pedidos exigen asignación de anfitrionas; las ventas directas no. */
  exigirAnfitrionas?: boolean;
  /** Catálogo legado sin `opciones_venta`: solo se valida estructura y champaña. */
  permitirSinConfiguracion?: boolean;
}

/** No compara subtotales: Entradas/Covers aplican sus créditos fuera de inventario. */
export async function validarPreciosConfigurados(
  trx: TransactionQuery,
  detalles: DetallePrecioInventario[],
  opciones: OpcionesPreciosVenta = {}
): Promise<PrecioInventarioValidado[]> {
  const { exigirAnfitrionas = true, permitirSinConfiguracion = false } = opciones;
  if (!detalles.length) return [];
  const presentations = await bloquearYValidarConfiguracionVenta(trx, detalles);
  const ids = [...new Set(detalles.map(d => d.producto_id))];
  const products = await trx<ProductoPrecio[]>(
    `SELECT P.id_producto, P.precio, P.comision, P.max_anfitrionas, P.estado,
            EXISTS (SELECT 1 FROM inventario_presentaciones IP WHERE IP.producto_id = P.id_producto) AS tiene_presentaciones,
            C.nombre AS categoria
       FROM productos P LEFT JOIN categorias C ON C.id_categoria = P.categoria_id
      WHERE P.id_producto IN (${ids.map(() => '?').join(',')})`,
    ids
  );
  const tiers = await trx<TramoPrecio[]>(
    `SELECT producto_id, anfitrionas, precio, comision FROM producto_champagne_tiers
      WHERE producto_id IN (${ids.map(() => '?').join(',')})`,
    ids
  );
  const drinkHosts = new Set<string>();
  const champagneHosts = new Set<string>();
  return detalles.map(d => {
    const product = products.find(p => String(p.id_producto) === d.producto_id);
    if (!product || Number(product.estado) === 0)
      throw new BusinessError('El producto del pedido no esta disponible');
    if (!d.presentacion_id && product.tiene_presentaciones)
      throw new BusinessError('Selecciona la presentacion del producto para comprobar el stock');
    const presentation = d.presentacion_id ? presentations.get(d.presentacion_id) : undefined;
    if (d.presentacion_id && (!presentation || presentation.producto_id !== d.producto_id))
      throw new BusinessError('La presentacion no pertenece al producto');
    const options = parseOpcionesVenta(presentation?.opciones_venta) ?? [];
    const hosts = [...new Set([...(d.hostesses ?? []), ...(d.hostess_id ? [d.hostess_id] : [])])];
    const productTiers = tiers.filter(t => String(t.producto_id) === d.producto_id);
    if (!options.length && permitirSinConfiguracion) {
      const champagne = d.tipo_venta !== 'shot' && esCategoriaChampagne(product.categoria);
      if (
        champagne &&
        d.botella_anfitriona !== false &&
        faltaConfiguracionChampagne(product.max_anfitrionas, productTiers)
      )
        throw new BusinessError(MENSAJE_CHAMPAGNE_SIN_CONFIGURAR);
      return { isChampagne: champagne };
    }
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
      if (
        bottle?.en_venta === false ||
        (d.botella_anfitriona !== false && bottle?.vender_con_anfitriona === false)
      ) {
        prices = [];
      } else if (d.botella_anfitriona === false) {
        prices = [{ precio: Number(bottle?.precio_sin_anfitriona ?? 0), comision: 0 }];
      } else {
        const tier = productTiers.find(t => Number(t.anfitrionas) === hosts.length);
        prices = [
          tier && hosts.length
            ? tier
            : {
                precio: Number(bottle?.precio ?? presentation?.precio_venta ?? product.precio),
                comision: Number(bottle?.comision ?? presentation?.comision ?? product.comision)
              }
        ];
      }
    }
    const price = prices.find(
      p =>
        Number.isFinite(Number(p.precio)) &&
        Number(p.precio) > 0 &&
        Number.isFinite(Number(p.comision)) &&
        Number(p.comision) >= 0 &&
        Number(p.precio) === d.precio &&
        Number(p.comision) * d.cantidad === d.comision
    );
    if (!price || !Number.isFinite(d.cantidad) || d.cantidad < 1)
      throw new BusinessError('El precio o la comision no coincide con el formato seleccionado');
    if (exigirAnfitrionas) {
      if (Number(price.comision) > 0 && (!hosts.length || (d.generaComision ?? 1) !== 1))
        throw new BusinessError('Selecciona anfitriona para cada producto con comision');
      if (Number(price.comision) === 0 && hosts.length)
        throw new BusinessError('Un producto sin comision no admite anfitriona');
    }
    const champagne = d.tipo_venta !== 'shot' && esCategoriaChampagne(product.categoria);
    if (
      champagne &&
      d.botella_anfitriona !== false &&
      faltaConfiguracionChampagne(product.max_anfitrionas, productTiers)
    )
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
    return { isChampagne: champagne };
  });
}

export async function validarConfiguracionVenta(
  trx: TransactionQuery,
  detalles: ConsumoInventarioDetalle[]
): Promise<void> {
  await bloquearYValidarConfiguracionVenta(trx, detalles);
}
