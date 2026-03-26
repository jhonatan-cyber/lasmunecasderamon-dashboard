import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea un número como moneda
 * @param value - El valor a formatear
 * @param currency - La moneda (por defecto CLP)
 * @returns El valor formateado como moneda
 */
export function formatCurrency(value: number, currency: string = 'CLP'): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0
  }).format(value)
}
