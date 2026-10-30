import type { PresentacionFormItem, ProductFormValues } from './productFormTypes';
import { vencimientoCalculado } from '@/lib/business/vencimiento';

export const FOTOS_PERMITIDAS = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
export const FOTO_MAX_BYTES = 5 * 1024 * 1024;

export const initialFormState: ProductFormValues = {
  code: '',
  name: '',
  description: '',
  ml_shot: '',
  ml_shot_anfitriona: ''
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
  fecha_elaboracion: string;
  duracion_meses: string;
  fecha_vencimiento: string;
}

export const emptyPresentacion = (): PresentacionFormItem => ({
  nombre: '',
  codigo_barras: '',
  precio_compra: '',
  stock_minimo: '',
  stock_maximo: '',
  stock: '',
  fecha_elaboracion: '',
  duracion_meses: '',
  fecha_vencimiento: '',
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
  stock: '',
  fecha_elaboracion: '',
  duracion_meses: '',
  fecha_vencimiento: ''
});

export const formatNumber = (value: string) =>
  value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** Campos que, al cambiar, recalculan el vencimiento del lote de la presentación. */
export const CAMPOS_RECALCULAN_VENCIMIENTO = ['fecha_elaboracion', 'duracion_meses'];

/**
 * Recalcula el vencimiento de una presentación cuando cambian su elaboración o
 * su duración: el día se recorta al fin del mes. Misma regla que el servidor
 * (`resolverVencimiento`), y si el cálculo no es posible se conserva el valor
 * que ya tenía (el vencimiento informado a mano manda).
 */
export function recalcularVencimiento<
  T extends { fecha_elaboracion: string; duracion_meses: string; fecha_vencimiento: string }
>(item: T, campo: string): T {
  if (!CAMPOS_RECALCULAN_VENCIMIENTO.includes(campo)) return item;
  const calculado = vencimientoCalculado(item.fecha_elaboracion, item.duracion_meses);
  return calculado ? { ...item, fecha_vencimiento: calculado } : item;
}

/** Valor plano que espera la API: sin separadores de miles. */
export const getNumericValue = (value: string) => value.replace(/\./g, '');

/** Qué rechazo corresponde al archivo, si lo hay. */
export function validarArchivoFoto(file: File): 'tipo' | 'tamano' | null {
  if (!FOTOS_PERMITIDAS.includes(file.type)) return 'tipo';
  if (file.size > FOTO_MAX_BYTES) return 'tamano';
  return null;
}
