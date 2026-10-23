import { describe, expect, it } from 'vitest';
import { calcularTotalReserva, MAX_TOTAL_RESERVA } from '@/lib/business/quinchos';

describe('calcularTotalReserva', () => {
  it('multiplica personas por monto por persona', () => {
    expect(calcularTotalReserva(10, 5000)).toBe(50000);
    expect(calcularTotalReserva('4', '12500')).toBe(50000);
    expect(calcularTotalReserva(1, 1)).toBe(1);
  });

  it('ignora decimales accidentales en los montos', () => {
    expect(calcularTotalReserva('2.9', '1000.7')).toBe(2000);
  });

  it('devuelve 0 mientras faltan datos o no sirven', () => {
    expect(calcularTotalReserva('', '')).toBe(0);
    expect(calcularTotalReserva(0, 5000)).toBe(0);
    expect(calcularTotalReserva(10, 0)).toBe(0);
    expect(calcularTotalReserva(-3, 5000)).toBe(0);
    expect(calcularTotalReserva('diez', 5000)).toBe(0);
    expect(calcularTotalReserva(10, 'mucho')).toBe(0);
  });

  it('el tope coincide con el entero máximo de PostgreSQL', () => {
    expect(MAX_TOTAL_RESERVA).toBe(2147483647);
  });
});
