export interface Product {
  categoria?: string;
  created_at?: string | null;
  updated_at?: string | null;
  max_anfitrionas?: number | null;
  id: string;
  code: string;
  name: string;
  category_id: string;
  display_order?: number;
  price: number;
  commission: number;
  description: string;
  fecha_crea?: string;
  status: number;
  foto?: string;
  stock_almacen?: number;
}

export interface Presentacion {
  categoria_nombre?: string | null;
  stock_bar?: number;
  opciones_venta?: import('./sale-options').SaleOption[];
  id: string;
  producto_id: string;
  nombre: string;
  codigo_barras?: string | null;
  precio_compra?: number;
  precio_venta?: number;
  comision?: number;
  foto?: string | null;
  stock?: number;
}

export interface UnidadProducto {
  fecha_crea?: string | null;
  fecha_impresion?: string | null;
  compra_id?: string | null;
  compra_folio?: string | null;
  id: string;
  producto_id: string;
  presentacion_id?: string | null;
  codigo: string;
  codigo_barras?: string | null;
  estado: string;
}
