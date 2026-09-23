export interface PurchaseDetailInput {
  producto_id: string;
  presentacion_id: string;
  cantidad: number;
  precio_compra: number;
}

export interface PurchaseCreate {
  detalles: PurchaseDetailInput[];
  proveedor?: string | null;
  telefono?: string | null;
  observaciones?: string | null;
}

export interface PurchaseDetail extends PurchaseDetailInput {
  id: string;
  subtotal: number;
  producto_nombre: string;
  presentacion_nombre: string;
}

export interface PurchaseRecord {
  id: string;
  folio: string;
  total: number;
  proveedor: string | null;
  telefono: string | null;
  observaciones: string | null;
  usuario_id: string | null;
  usuario_nombre: string | null;
  fecha_crea: string;
  detalles: PurchaseDetail[];
}
