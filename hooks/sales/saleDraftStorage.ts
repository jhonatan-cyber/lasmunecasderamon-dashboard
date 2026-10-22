export const SALE_DRAFT_KEYS = [
  'selectedCliente',
  'selectedHabitacion',
  'metodoPago',
  'productos',
  'enableTip'
] as const;

export interface RestoreSaleDraftTargets {
  cliente: (value: string) => void;
  habitacion: (value: string) => void;
  metodoPago: (value: string) => void;
  productos: (value: any[]) => void;
  enableTip: (value: boolean) => void;
}

/**
 * Rehidrata el borrador guardado.
 *
 * Aplica campo a campo a propósito: si `productos` quedó corrupto, la lectura
 * lanza y solo se conservan los campos ya aplicados — el formulario sigue
 * usable en vez de quedarse sin nada.
 */
export function restoreSaleDraft(apply: RestoreSaleDraftTargets): void {
  try {
    apply.cliente(localStorage.getItem('selectedCliente') || 'none');
    apply.habitacion(localStorage.getItem('selectedHabitacion') || '');
    apply.metodoPago(localStorage.getItem('metodoPago') || '');
    const saved = localStorage.getItem('productos');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) apply.productos(parsed);
    }
    apply.enableTip(localStorage.getItem('enableTip') === 'true');
  } catch {
    /* Ignora borradores dañados o almacenamiento no disponible. */
  }
}

export function persistSaleDraft({
  enableTip,
  selectedCliente,
  selectedHabitacion,
  metodoPago,
  productos
}: {
  enableTip: boolean;
  selectedCliente: string;
  selectedHabitacion: string;
  metodoPago: string;
  productos: any[];
}): void {
  try {
    localStorage.setItem('enableTip', String(enableTip));
    localStorage.setItem('selectedCliente', selectedCliente);
    localStorage.setItem('selectedHabitacion', selectedHabitacion);
    localStorage.setItem('metodoPago', metodoPago);
    localStorage.setItem('productos', JSON.stringify(productos));
  } catch {
    /* Mantiene el formulario operativo sin almacenamiento. */
  }
}

export function clearSaleDraft(): void {
  try {
    SALE_DRAFT_KEYS.forEach(key => localStorage.removeItem(key));
  } catch {
    /* La venta ya fue registrada. */
  }
}

/** Servicio activo precargado por query string (`?servicio_id=`), si lo hay. */
export function readServicioIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('servicio_id');
}
