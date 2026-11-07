export interface PurchaseCatalogItem {
  categoria_nombre?: string | null;
  codigo_barras?: string | null;
  id: string;
  producto_id: string;
  producto_nombre: string;
  nombre: string;
  foto: string;
  precio_compra: number;
  stock: number;
  resumen_stock?: PurchaseStockSummary;
}

export interface PurchaseStockGroup {
  cantidad: number;
  codigos: string[];
}

export interface PurchaseStockSummary {
  vencidas: PurchaseStockGroup;
  por_vencer: PurchaseStockGroup;
  buen_estado: PurchaseStockGroup;
}

export interface Line {
  presentacion_id: string;
  producto_id: string;
  producto_nombre: string;
  presentacion_nombre: string;
  foto: string;
  cantidad: string;
  precio_compra: string;
  fecha_elaboracion: string;
  duracion_meses: string;
  fecha_vencimiento: string;
}

export interface PurchaseFormProps {
  catalog: PurchaseCatalogItem[];
  initialItems?: { presentacion_id: string; cantidad: number }[];
}

export const formatMiles = (v: string) =>
  v.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export const toNumber = (v: string) => Number(v.replace(/\./g, '')) || 0;
export const metodoPagoLabel = (method: string) =>
  ({ efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta' })[
    method as 'efectivo' | 'transferencia' | 'tarjeta'
  ] ?? method;
