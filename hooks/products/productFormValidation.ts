import { StockLimitsSchema } from '@/lib/business/stockLimits';
import { esFechaISO } from '@/lib/business/vencimiento';
import type { PresentacionFormItem, ProductFormValues } from './productFormTypes';
import { getNumericValue } from './productFormFormat';

export function validateProductForm(
  form: ProductFormValues
): Partial<Record<keyof ProductFormValues, string>> {
  const newErrors: Partial<Record<keyof ProductFormValues, string>> = {};
  if (!form.code.trim()) newErrors.code = 'El código es requerido';
  if (!form.name.trim()) newErrors.name = 'El nombre es requerido';
  return newErrors;
}

export function validatePresentaciones(
  items: PresentacionFormItem[],
  { isEdit, existentes }: { isEdit: boolean; existentes: { codigo_barras?: string | null }[] }
): string {
  if (!isEdit && items.length === 0) return 'Agrega al menos una presentación (ej. 750 ml)';
  const vistos = new Set<string>();
  for (const item of items) {
    const etiqueta = item.nombre.trim() || 'presentación';
    if (!item.nombre.trim()) return 'Cada presentación requiere un nombre (ej. 750 ml)';
    if (
      item.precio_compra.trim() &&
      (isNaN(Number(getNumericValue(item.precio_compra))) ||
        Number(getNumericValue(item.precio_compra)) < 0)
    )
      return `Precio de compra inválido en "${etiqueta}"`;
    if (!/^\d*$/.test(getNumericValue(item.stock)))
      return `Stock inválido en "${etiqueta}": entero mayor o igual a 0`;
    if (
      !StockLimitsSchema.safeParse({
        stock_minimo: getNumericValue(item.stock_minimo || ''),
        stock_maximo: getNumericValue(item.stock_maximo || '')
      }).success
    )
      return 'Indica mínimo y máximo válidos, con máximo mayor o igual al mínimo';
    if (item.fecha_elaboracion && !esFechaISO(item.fecha_elaboracion))
      return `Fecha de elaboración inválida en "${etiqueta}"`;

    const hoy = new Date().toISOString().slice(0, 10);
    if (item.fecha_elaboracion && item.fecha_elaboracion > hoy)
      return `La fecha de elaboración no puede ser futura en "${etiqueta}"`;

    if (item.duracion_meses) {
      if (!/^\d+$/.test(item.duracion_meses) || Number(item.duracion_meses) < 1)
        return `La duración debe ser al menos 1 mes en "${etiqueta}"`;
    }
    if (item.fecha_vencimiento && !esFechaISO(item.fecha_vencimiento))
      return `Fecha de vencimiento inválida en "${etiqueta}"`;

    if (item.fecha_vencimiento && item.fecha_vencimiento < hoy)
      return `La fecha de vencimiento no puede ser anterior a hoy en "${etiqueta}"`;

    if (
      esFechaISO(item.fecha_elaboracion) &&
      esFechaISO(item.fecha_vencimiento) &&
      item.fecha_vencimiento < item.fecha_elaboracion
    )
      return 'El vencimiento no puede ser anterior a la elaboración';
    const codigo = item.codigo_barras.trim();
    if (codigo) {
      if (vistos.has(codigo)) return `Código de barras duplicado: ${codigo}`;
      vistos.add(codigo);
      if (existentes.some(e => (e.codigo_barras || '') === codigo))
        return `El código ${codigo} ya existe en este producto`;
    }
  }
  return '';
}
