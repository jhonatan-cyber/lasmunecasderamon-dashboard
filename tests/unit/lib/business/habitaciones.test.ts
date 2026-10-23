import { describe, expect, it } from 'vitest';
import { esHabitacionSoloVentas, habitacionesParaServicio } from '@/lib/business/habitaciones';

describe('esHabitacionSoloVentas', () => {
  it('marca solo ventas cuando no hay precio, comisión ni duración', () => {
    expect(esHabitacionSoloVentas({ precio: 0, comision_anfitriona: 0, tiempo: 0 })).toBe(true);
  });

  it('trata nulos, ausentes y numéricos en texto como cero', () => {
    expect(esHabitacionSoloVentas({ precio: null, comision_anfitriona: null, tiempo: null })).toBe(
      true
    );
    expect(esHabitacionSoloVentas({})).toBe(true);
    expect(esHabitacionSoloVentas({ precio: '0', comision_anfitriona: '0', tiempo: '0' })).toBe(
      true
    );
  });

  it('reconoce las claves del dashboard (price/time)', () => {
    expect(esHabitacionSoloVentas({ price: 0, time: 0, comision_anfitriona: 0 })).toBe(true);
    expect(esHabitacionSoloVentas({ price: 1000, time: 30 })).toBe(false);
  });

  it('basta una prestación configurada para dejar de ser solo ventas', () => {
    expect(esHabitacionSoloVentas({ precio: 1000 })).toBe(false);
    expect(esHabitacionSoloVentas({ comision_anfitriona: 5000 })).toBe(false);
    expect(esHabitacionSoloVentas({ tiempo: 30 })).toBe(false);
  });

  it('no trata como solo ventas una habitación ausente ni valores ilegibles', () => {
    expect(esHabitacionSoloVentas(null)).toBe(false);
    expect(esHabitacionSoloVentas(undefined)).toBe(false);
    expect(esHabitacionSoloVentas({ precio: 'sin dato' })).toBe(false);
  });
});

describe('habitacionesParaServicio', () => {
  it('deja fuera las habitaciones que solo sirven para ventas', () => {
    const habitaciones = [
      { id: 'venta', precio: 0, comision_anfitriona: 0, tiempo: 0 },
      { id: 'privado', precio: 30000, comision_anfitriona: 0, tiempo: 60 },
      { id: 'comision', price: 0, time: 0, comision_anfitriona: 5000 }
    ];

    expect(habitacionesParaServicio(habitaciones).map(habitacion => habitacion.id)).toEqual([
      'privado',
      'comision'
    ]);
  });
});
