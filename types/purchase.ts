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

/** Código de unidad generado al ingresar stock (uno por unidad comprada). */
export interface PurchaseGeneratedCode {
  id: string;
  codigo: string;
  codigo_barras: string;
  producto_id: string;
  producto_nombre: string;
  presentacion_id: string;
  presentacion_nombre: string;
  compra_folio: string;
}

/** Compra recién registrada, con los códigos que quedaron pendientes de imprimir. */
export interface PurchaseRegistered {
  id: string;
  folio: string;
  total: number;
  observaciones: string | null;
  usuario_id: string | null;
  fecha_crea: string;
  codigos_generados: PurchaseGeneratedCode[];
}
