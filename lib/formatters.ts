/**
 * Funciones de utilidad para formatear diferentes tipos de datos
 */

/**
 * Formatea un valor numérico como moneda
 * @param value - Valor a formatear (número o string)
 * @param type - Tipo de valor para mensajes personalizados
 * @returns String formateado
 */
export const formatCurrency = (
  value: number | string | undefined,
  type: "sueldo" | "aporte" | "descuento" | "general" = "general"
): string => {
  if (value === undefined || value === null) {
    return type === "sueldo"
      ? "Sin sueldo"
      : type === "aporte"
      ? "Sin aporte"
      : type === "descuento"
      ? "Sin descuento"
      : "$0";
  }
  
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return type === "sueldo"
      ? "Sin sueldo"
      : type === "aporte"
      ? "Sin aporte"
      : type === "descuento"
      ? "Sin descuento"
      : "$0";
  }
  
  return `$${new Intl.NumberFormat("es-CL", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue)}`;
};

/**
 * Formatea un valor numérico como moneda sin decimales
 * @param value - Valor a formatear (número o string)
 * @returns String formateado con punto de miles sin decimales
 */
export const formatCurrencyNoDecimals = (value: number | string | undefined): string => {
  if (value === undefined || value === null) {
    return "$0";
  }
  
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return "$0";
  }
  
  // Redondear el valor
  const roundedValue = Math.round(numValue);
  
  // Usar formato chileno con puntos de miles para todos los números
  return `$${roundedValue.toLocaleString('es-CL')}`;
};

/**
 * Formatea una fecha en formato legible
 * @param dateString - Fecha en formato string
 * @returns Fecha formateada o "Sin fecha" si no es válida
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "Sin fecha";
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-CL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {

    return "Fecha inválida";
  }
};

import { format } from "date-fns";
import { es } from "date-fns/locale";


export function formatFechaLarga(fecha: string | Date) {
  try {
    return format(new Date(fecha), "dd/MMMM/yyyy", { locale: es })
      .replace(/\b([a-z])/g, l => l.toLowerCase())
      .replace("/", "/");
  } catch {
    return "Fecha no válida";
  }
}

// Ejemplo: 25/julio/2025

/**
 * Formatea una fecha con hora en formato legible
 * @param fecha - Fecha en formato string o Date
 * @returns Fecha y hora formateada
 */
export function formatFechaConHora(fecha: string | Date) {
  try {
    return format(new Date(fecha), "dd/MMMM/yyyy HH:mm", { locale: es })
      .replace(/\b([a-z])/g, l => l.toLowerCase())
      .replace("/", "/");
  } catch {
    return "Fecha no válida";
  }
}

// Ejemplo: 25/julio/2025 14:30

/**
 * Formatea solo la fecha en formato legible
 * @param fecha - Fecha en formato string o Date
 * @returns Solo la fecha formateada
 */
export function formatSoloFecha(fecha: string | Date) {
  try {
    return format(new Date(fecha), "dd/MMMM/yyyy", { locale: es })
      .replace(/\b([a-z])/g, l => l.toLowerCase())
      .replace("/", "/");
  } catch {
    return "Fecha no válida";
  }
}

// Ejemplo: 25/julio/2025

/**
 * Formatea solo la hora en formato legible
 * @param fecha - Fecha en formato string o Date
 * @returns Solo la hora formateada
 */
export function formatSoloHora(fecha: string | Date) {
  try {
    return format(new Date(fecha), "HH:mm", { locale: es });
  } catch {
    return "Hora no válida";
  }
}

// Ejemplo: 14:30

/**
 * Formatea un valor numérico como moneda con formato abreviado para números grandes
 * @param value - Valor a formatear (número o string)
 * @returns String formateado con formato abreviado
 */
export const formatCurrencyAbbreviated = (value: number | string | undefined): string => {
  if (value === undefined || value === null) {
    return "$0";
  }
  
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return "$0";
  }
  
  const absValue = Math.abs(numValue);
  const sign = numValue < 0 ? "-" : "";
  
  if (absValue >= 1000000000) {
    const billions = absValue / 1000000000;
    return `${sign}$${billions.toFixed(1)}B`;
  }
  
  if (absValue >= 1000000) {
    const millions = absValue / 1000000;
    return `${sign}$${millions.toFixed(1)}M`;
  }
  
  if (absValue >= 1000) {
    const thousands = absValue / 1000;
    return `${sign}$${thousands.toFixed(1)}K`;
  }
  
  return `${sign}$${Math.round(absValue).toLocaleString('es-CL')}`;
};
