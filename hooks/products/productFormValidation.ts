import { StockLimitsSchema } from '@/lib/business/stockLimits';
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

/**
 * Devuelve el primer problema de las presentaciones del formulario, o '' si
 * todas son válidas. En edición no se exige al menos una fila.
 */
export function validatePresentaciones(
  items: PresentacionFormItem[],
  { isEdit, existentes }: { isEdit: boolean; existentes: { codigo_barras?: string | null }[] }
): string {
  if (!isEdit && items.length === 0) return 'Agrega al menos una presentación (ej. 750 ml)';
  const vistos = new Set<string>();
  for (const item of items) {
    if (!item.nombre.trim()) return 'Cada presentación requiere un nombre (ej. 750 ml)';
    if (
      item.precio_compra.trim() &&
      (isNaN(Number(getNumericValue(item.precio_compra))) ||
        Number(getNumericValue(item.precio_compra)) < 0)
    )
      return `Precio de compra inválido en "${item.nombre.trim() || 'presentación'}"`;
    if (!/^\d*$/.test(getNumericValue(item.stock)))
      return `Stock inválido en "${item.nombre.trim() || 'presentación'}": entero mayor o igual a 0`;
    if (
      !StockLimitsSchema.safeParse({
        stock_minimo: getNumericValue(item.stock_minimo || ''),
        stock_maximo: getNumericValue(item.stock_maximo || '')
      }).success
    )
      return 'Indica mínimo y máximo válidos, con máximo mayor o igual al mínimo';
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
