import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getSystemTimezone } from '@/lib/business/timezoneService';

export const formatCurrency = (
  value: number | string | undefined,
  type: 'sueldo' | 'aporte' | 'descuento' | 'general' = 'general'
): string => {
  if (value === undefined || value === null) {
    return type === 'sueldo'
      ? 'Sin sueldo'
      : type === 'aporte'
        ? 'Sin aporte'
        : type === 'descuento'
          ? 'Sin descuento'
          : '$0';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return type === 'sueldo'
      ? 'Sin sueldo'
      : type === 'aporte'
        ? 'Sin aporte'
        : type === 'descuento'
          ? 'Sin descuento'
          : '$0';
  }

  return new Intl.NumberFormat('es-CL', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);
};

export const formatCurrencyNoDecimals = (value: number | string | undefined): string => {
  if (value === undefined || value === null) {
    return '$0';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return '$0';
  }

  const roundedValue = Math.round(numValue);
  const formatted = roundedValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$${formatted}`;
};

export const formatCurrencyCLP = (value: number | string | undefined): string => {
  if (value === undefined || value === null) {
    return '$0';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return '$0';
  }

  return `$${new Intl.NumberFormat('es-CL', {
    maximumFractionDigits: 0,
  }).format(Math.round(numValue))}`;
};

export const formatNumberCL = (value: number | string | undefined): string => {
  if (value === undefined || value === null) {
    return '0';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return '0';
  }

  return Math.round(numValue).toLocaleString('es-CL');
};

export const SYSTEM_TIMEZONE = getSystemTimezone();

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Sin fecha';

  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: SYSTEM_TIMEZONE,
    }).format(date);
  } catch {
    return 'Fecha invalida';
  }
};

export function formatFechaLarga(fecha: string | Date) {
  try {
    const date = new Date(fecha);
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: SYSTEM_TIMEZONE,
    })
      .format(date)
      .toLowerCase();
  } catch {
    return 'Fecha no valida';
  }
}

export function formatFechaConHora(fecha: string | Date) {
  try {
    const date = new Date(fecha);
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: SYSTEM_TIMEZONE,
    })
      .format(date)
      .toLowerCase();
  } catch {
    return 'Fecha no valida';
  }
}

export function formatSoloFecha(fecha: string | Date) {
  try {
    return format(new Date(fecha), 'dd/MMMM/yyyy', { locale: es })
      .replace(/\b([a-z])/g, letter => letter.toLowerCase())
      .replace('/', '/');
  } catch {
    return 'Fecha no valida';
  }
}

export function formatSoloHora(fecha: string | Date) {
  try {
    const date = new Date(fecha);
    return new Intl.DateTimeFormat('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: SYSTEM_TIMEZONE,
    }).format(date);
  } catch {
    return 'Hora no valida';
  }
}

export const formatCurrencyAbbreviated = (value: number | string | undefined): string => {
  if (value === undefined || value === null) {
    return '$0';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return '$0';
  }

  const absValue = Math.abs(numValue);
  const sign = numValue < 0 ? '-' : '';

  if (absValue >= 1000000000) {
    const billions = absValue / 1000000000;
    return `${sign}${billions.toFixed(1)}B`;
  }

  if (absValue >= 1000000) {
    const millions = absValue / 1000000;
    return `${sign}${millions.toFixed(1)}M`;
  }

  if (absValue >= 1000) {
    const thousands = absValue / 1000;
    return `${sign}${thousands.toFixed(1)}K`;
  }

  return `${sign}$${Math.round(absValue).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};
