/**
 * Tests unitarios para lib/utils/formatters.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatCurrency,
  formatCurrencyNoDecimals,
  formatCurrencyCLP,
  formatNumberCL,
  formatDate,
  formatFechaLarga,
  formatFechaConHora,
  formatSoloHora,
  formatCurrencyAbbreviated,
  toTitleCase
} from '@/lib/utils/formatters';

// Mock de timezoneService
vi.mock('@/lib/business/timezoneService', () => ({
  getSystemTimezone: () => 'America/Santiago'
}));

describe('formatCurrency', () => {
  it('debería formatear un número normal', () => {
    expect(formatCurrency(1000)).toBe('1.000,00');
    expect(formatCurrency(10000)).toBe('10.000,00');
    expect(formatCurrency(1000000)).toBe('1.000.000,00');
  });

  it('debería formatear un string numérico', () => {
    expect(formatCurrency('1000')).toBe('1.000,00');
    expect(formatCurrency('50000')).toBe('50.000,00');
  });

  it('debería devolver texto predeterminado para undefined', () => {
    expect(formatCurrency(undefined)).toBe('$0');
    expect(formatCurrency(undefined, 'sueldo')).toBe('Sin sueldo');
    expect(formatCurrency(undefined, 'aporte')).toBe('Sin aporte');
    expect(formatCurrency(undefined, 'descuento')).toBe('Sin descuento');
  });

  it('debería devolver texto predeterminado para null', () => {
    expect(formatCurrency(null)).toBe('$0');
    expect(formatCurrency(null, 'sueldo')).toBe('Sin sueldo');
  });

  it('debería devolver texto predeterminado para NaN', () => {
    expect(formatCurrency(NaN)).toBe('$0');
    expect(formatCurrency('abc')).toBe('$0');
  });
});

describe('formatCurrencyNoDecimals', () => {
  it('debería formatear sin decimales', () => {
    expect(formatCurrencyNoDecimals(1000)).toBe('$1.000');
    expect(formatCurrencyNoDecimals(10050)).toBe('$10.050');
    expect(formatCurrencyNoDecimals(1000000)).toBe('$1.000.000');
  });

  it('debería devolver $0 para valores inválidos', () => {
    expect(formatCurrencyNoDecimals(undefined)).toBe('$0');
    expect(formatCurrencyNoDecimals(null)).toBe('$0');
    expect(formatCurrencyNoDecimals(NaN)).toBe('$0');
    expect(formatCurrencyNoDecimals('abc')).toBe('$0');
  });
});

describe('formatCurrencyCLP', () => {
  it('debería formatear sin decimales (CLP)', () => {
    expect(formatCurrencyCLP(1000)).toBe('$1.000');
    expect(formatCurrencyCLP(1000000)).toBe('$1.000.000');
    expect(formatCurrencyCLP(999999)).toBe('$999.999');
  });

  it('debería devolver $0 para valores inválidos', () => {
    expect(formatCurrencyCLP(undefined)).toBe('$0');
    expect(formatCurrencyCLP(null)).toBe('$0');
    expect(formatCurrencyCLP(NaN)).toBe('$0');
  });
});

describe('formatNumberCL', () => {
  it('debería formatear números con separador de miles', () => {
    expect(formatNumberCL(1000)).toBe('1.000');
    expect(formatNumberCL(1000000)).toBe('1.000.000');
  });

  it('debería devolver 0 para valores inválidos', () => {
    expect(formatNumberCL(undefined)).toBe('0');
    expect(formatNumberCL(null)).toBe('0');
    expect(formatNumberCL(NaN)).toBe('0');
  });
});

describe('formatDate', () => {
  it('debería devolver "Sin fecha" para null', () => {
    expect(formatDate(null)).toBe('Sin fecha');
  });

  it('debería devolver "Sin fecha" para undefined', () => {
    expect(formatDate(undefined)).toBe('Sin fecha');
  });

  it('debería devolver "Sin fecha" para string vacío', () => {
    expect(formatDate('')).toBe('Sin fecha');
  });

  it('debería devolver "Fecha invalida" para fecha inválida', () => {
    expect(formatDate('fecha-invalida')).toBe('Fecha invalida');
  });
});

describe('formatFechaLarga', () => {
  it('debería devolver "Fecha no valida" para fecha inválida', () => {
    expect(formatFechaLarga('invalid')).toBe('Fecha no valida');
  });
});

describe('formatFechaConHora', () => {
  it('debería devolver "Fecha no valida" para fecha inválida', () => {
    expect(formatFechaConHora('invalid')).toBe('Fecha no valida');
  });
});

describe('formatSoloHora', () => {
  it('debería devolver "Hora no valida" para fecha inválida', () => {
    expect(formatSoloHora('invalid')).toBe('Hora no valida');
  });
});

describe('formatCurrencyAbbreviated', () => {
  it('debería abbreviate a miles (K)', () => {
    // El formato real usa punto en vez de coma
    expect(formatCurrencyAbbreviated(1000)).toContain('K');
    expect(formatCurrencyAbbreviated(10000)).toContain('K');
    expect(formatCurrencyAbbreviated(999999)).toContain('K');
  });

  it('debería abbreviate a millones (M)', () => {
    expect(formatCurrencyAbbreviated(1000000)).toContain('M');
    expect(formatCurrencyAbbreviated(5000000)).toContain('M');
  });

  it('debería abbreviate a miles de millones (B)', () => {
    expect(formatCurrencyAbbreviated(1000000000)).toContain('B');
  });

  it('debería manejar valores negativos', () => {
    expect(formatCurrencyAbbreviated(-1000)).toContain('-');
  });

  it('debería devolver $0 para valores inválidos', () => {
    expect(formatCurrencyAbbreviated(undefined)).toBe('$0');
    expect(formatCurrencyAbbreviated(null)).toBe('$0');
    expect(formatCurrencyAbbreviated(NaN)).toBe('$0');
  });
});

describe('toTitleCase', () => {
  it('debería convertir a title case', () => {
    expect(toTitleCase('hola mundo')).toBe('Hola Mundo');
    expect(toTitleCase('EL PERRO')).toBe('El Perro');
    expect(toTitleCase('juan')).toBe('Juan');
  });
});
