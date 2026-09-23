import { describe, it, expect } from 'vitest';
import {
  getServiceLevel,
  requiereAnfitriona,
  requiereHabitacion,
  normalizeServiceLevels,
  DEFAULT_SERVICE_LEVELS
} from '@/lib/business/saleServiceLevels';

describe('getServiceLevel (defaults 20000 / 30000)', () => {
  it('clasifica por bandas de precio', () => {
    expect(getServiceLevel(0)).toBe('ninguno');
    expect(getServiceLevel(19999)).toBe('ninguno');
    expect(getServiceLevel(20000)).toBe('anfitriona');
    expect(getServiceLevel(25000)).toBe('anfitriona');
    expect(getServiceLevel(29999)).toBe('anfitriona');
    expect(getServiceLevel(30000)).toBe('anfitriona+habitacion');
    expect(getServiceLevel(120000)).toBe('anfitriona+habitacion');
  });

  it('respeta configuración dinámica', () => {
    const cfg = { hostessDesde: 10000, habitacionDesde: 50000 };
    expect(getServiceLevel(5000, cfg)).toBe('ninguno');
    expect(getServiceLevel(20000, cfg)).toBe('anfitriona');
    expect(getServiceLevel(60000, cfg)).toBe('anfitriona+habitacion');
  });

  it('tolera valores inválidos', () => {
    expect(getServiceLevel(undefined)).toBe('ninguno');
    expect(getServiceLevel('abc')).toBe('ninguno');
    expect(getServiceLevel('25000')).toBe('anfitriona');
  });
});

describe('helpers', () => {
  it('requiereAnfitriona y requiereHabitacion', () => {
    expect(requiereAnfitriona(20000)).toBe(true);
    expect(requiereAnfitriona(19999)).toBe(false);
    expect(requiereHabitacion(30000)).toBe(true);
    expect(requiereHabitacion(29999)).toBe(false);
  });

  it('normalizeServiceLevels con defaults', () => {
    expect(normalizeServiceLevels()).toEqual(DEFAULT_SERVICE_LEVELS);
    expect(normalizeServiceLevels({ hostessDesde: -5 })).toEqual(DEFAULT_SERVICE_LEVELS);
    expect(normalizeServiceLevels({ hostessDesde: 15000, habitacionDesde: 40000 })).toEqual({
      hostessDesde: 15000,
      habitacionDesde: 40000
    });
  });
});
