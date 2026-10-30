export interface ProductFormValues {
  code: string;
  name: string;
  description: string;
  ml_shot: string;
  ml_shot_anfitriona: string;
}

export interface PresentacionFormItem {
  nombre: string;
  codigo_barras: string;
  precio_compra: string;
  stock: string;
  stock_minimo?: string;
  stock_maximo?: string;
  /** Fechas del lote de esta presentación (ISO `YYYY-MM-DD`; duración en meses). */
  fecha_elaboracion: string;
  duracion_meses: string;
  fecha_vencimiento: string;
  foto: File | null;
  fotoPreview: string;
  fotoUrl: string;
}

export interface UnidadCodigoItem {
  id: string;
  codigo: string;
  codigo_barras: string | null;
  compra_folio?: string | null;
  fecha_crea?: string | null;
  fecha_impresion?: string | null;
  presentacion_id?: string | null;
  estado?: string;
}
