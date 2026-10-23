export interface ProductFormValues {
  code: string;
  name: string;
  description: string;
  /** Ml por shot del producto (vacío = usar el global de Configuraciones). */
  ml_shot: string;
  /** Ml por shot a anfitriona (vacío = igual que a cliente). */
  ml_shot_anfitriona: string;
  /** Fecha de elaboración del lote, ISO (vacío = sin dato). */
  fecha_elaboracion: string;
  /** Duración en meses desde la elaboración (vacío = sin dato). */
  duracion_meses: string;
  /** Fecha de vencimiento: se calcula con elaboración + duración o se ingresa a mano. */
  fecha_vencimiento: string;
}

export interface PresentacionFormItem {
  nombre: string;
  codigo_barras: string;
  precio_compra: string;
  stock: string;
  stock_minimo?: string;
  stock_maximo?: string;
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
