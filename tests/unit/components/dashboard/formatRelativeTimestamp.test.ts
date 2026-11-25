import { describe, expect, it } from 'vitest';
import { formatRelativeTimestamp } from '@/components/dashboard/formatRelativeTimestamp';

describe('formatRelativeTimestamp', () => {
  const now = new Date('2026-11-25T12:00:00.000Z').getTime();

  it('muestra la hora relativa en vez de una etiqueta genérica', () => {
    expect(formatRelativeTimestamp('2026-11-25T11:56:00.000Z', now)).toBe('hace 4 min');
  });

  it('maneja fechas futuras e inválidas sin mostrar datos engañosos', () => {
    expect(formatRelativeTimestamp('2026-11-25T12:02:00.000Z', now)).toBe('dentro de 2 min');
    expect(formatRelativeTimestamp('fecha inválida', now)).toBe('fecha desconocida');
  });
});
