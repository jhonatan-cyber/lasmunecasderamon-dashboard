import type { PresentacionFormItem, ProductFormValues } from './productFormTypes';

export const FOTOS_PERMITIDAS = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
export const FOTO_MAX_BYTES = 5 * 1024 * 1024;

export const initialFormState: ProductFormValues = {
  code: '',
  name: '',
  description: '',
  ml_shot: '',
  ml_shot_anfitriona: '',
  fecha_elaboracion: '',
  duracion_meses: '',
  fecha_vencimiento: ''
};

export interface EditPresDraft {
  nombre: string;
  codigo_barras: string;
  precio_compra: string;
  precio_venta: string;
  comision: string;
  stock_minimo: string;
  stock_maximo: string;
  stock: string;
}

export const emptyPresentacion = (): PresentacionFormItem => ({
  nombre: '',
  codigo_barras: '',
  precio_compra: '',
  stock_minimo: '',
  stock_maximo: '',
  stock: '',
  foto: null,
  fotoPreview: '',
  fotoUrl: ''
});

export const emptyEditDraft = (): EditPresDraft => ({
  nombre: '',
  codigo_barras: '',
  precio_compra: '',
  precio_venta: '',
  comision: '',
  stock_minimo: '',
  stock_maximo: '',
  stock: ''
});

/** Miles con punto para los campos de importe mientras se edita. */
export const formatNumber = (value: string) =>
  value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** Valor plano que espera la API: sin separadores de miles. */
export const getNumericValue = (value: string) => value.replace(/\./g, '');

/** Qué rechazo corresponde al archivo, si lo hay. */
export function validarArchivoFoto(file: File): 'tipo' | 'tamano' | null {
  if (!FOTOS_PERMITIDAS.includes(file.type)) return 'tipo';
  if (file.size > FOTO_MAX_BYTES) return 'tamano';
  return null;
}
