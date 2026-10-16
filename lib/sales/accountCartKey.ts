import { saleInventoryFields, type SaleInventoryFields } from './saleInventoryFields';

interface AccountProduct extends SaleInventoryFields {
  id?: string | number;
  id_producto?: string | number;
  producto_id?: string | number;
  precio?: number;
  price?: number;
  comision?: number;
  commission?: number;
  selectedHostesses?: Array<string | number>;
}

/** Dos formatos del mismo producto no deben fusionar su precio o consumo. */
export function accountCartKey(product: AccountProduct) {
  return JSON.stringify([
    String(product.presentacion_id ?? product.id ?? product.id_producto ?? product.producto_id),
    saleInventoryFields(product),
    Number(product.precio ?? product.price ?? 0),
    Number(product.comision ?? product.commission ?? 0),
    [...(product.selectedHostesses ?? [])].map(String).sort()
  ]);
}
