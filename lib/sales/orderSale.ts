import { saleInventoryFields, type SaleInventoryFields } from './saleInventoryFields';

type OrderLine = SaleInventoryFields & {
  configuracion_venta?: SaleInventoryFields | string | null;
  id_producto?: string;
  producto_id: string;
  precio: number;
  cantidad: number;
  comision?: number;
  genera_comision?: number;
  hostess_id?: string | null;
  anfitrionas_asignadas_ids?: string | string[] | null;
};

/** Conserva cada línea del pedido y su comisión total al registrarla como venta. */
export function orderLineToSaleDetail(item: OrderLine) {
  const inventory = saleInventoryFields(item);
  const ids = item.anfitrionas_asignadas_ids;
  const hostesses = [
    ...new Set(
      (Array.isArray(ids) ? ids : (ids?.split(',') ?? [])).map(id => id.trim()).filter(Boolean)
    )
  ];
  if (item.hostess_id && !hostesses.includes(item.hostess_id)) hostesses.push(item.hostess_id);
  const hasCommission =
    item.genera_comision !== 0 && !(inventory.tipo_venta === 'shot' && !inventory.shot_anfitriona);
  return {
    ...inventory,
    producto_id: item.id_producto || item.producto_id,
    precio: Number(item.precio || 0),
    cantidad: Number(item.cantidad || 0),
    comision: hasCommission ? Number(item.comision || 0) : 0,
    sub_total: Number(item.precio || 0) * Number(item.cantidad || 0),
    hostess_id: hasCommission ? item.hostess_id || null : null,
    hostesses: hasCommission ? hostesses : []
  };
}
