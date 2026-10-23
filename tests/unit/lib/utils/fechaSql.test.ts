import { describe, expect, it } from 'vitest';
import { formatFechaISO } from '@/lib/utils/fechaSql';

describe('formatFechaISO', () => {
  it('normaliza una columna date que llega como Date a YYYY-MM-DD', () => {
    // El driver entrega las columnas date como Date a medianoche local.
    expect(formatFechaISO(new Date(2026, 0, 15))).toBe('2026-01-15');
    expect(formatFechaISO(new Date(2026, 10, 3))).toBe('2026-11-03');
  });

  it('recorta el prefijo de un texto ISO con hora', () => {
    expect(formatFechaISO('2026-07-31')).toBe('2026-07-31');
    expect(formatFechaISO('2026-07-31T00:00:00.000Z')).toBe('2026-07-31');
  });

  it('devuelve null sin fecha o con basura', () => {
    expect(formatFechaISO(null)).toBeNull();
    expect(formatFechaISO(undefined)).toBeNull();
    expect(formatFechaISO('')).toBeNull();
    expect(formatFechaISO(new Date('ayer'))).toBeNull();
    expect(formatFechaISO('ayer')).toBeNull();
  });
});
