import { describe, expect, it } from 'vitest';
import { getDateRange, getMonthDays, isSameDay } from '@/hooks/calendar/roleCalendarGrid';
import { toDateKey } from '@/lib/utils/calendarUtils';

describe('getMonthDays', () => {
  it('arma 42 días sin fechas repetidas', () => {
    const dias = getMonthDays(new Date(2026, 9, 1));
    const claves = dias.map(dia => toDateKey(dia.date));

    expect(dias).toHaveLength(42);
    expect(new Set(claves).size).toBe(42);
  });

  it('rellena el inicio con los últimos días del mes anterior', () => {
    const dias = getMonthDays(new Date(2026, 9, 1));

    expect(toDateKey(dias[0].date)).toBe('2026-09-27');
    expect(dias[3].isCurrentMonth).toBe(false);
    expect(toDateKey(dias[4].date)).toBe('2026-10-01');
    expect(dias[4].isCurrentMonth).toBe(true);
  });

  it('funciona en enero, cruzando al año anterior', () => {
    const dias = getMonthDays(new Date(2027, 0, 1));

    expect(toDateKey(dias[0].date)).toBe('2026-12-27');
    expect(new Set(dias.map(dia => toDateKey(dia.date))).size).toBe(42);
  });
});

describe('getDateRange', () => {
  it('devuelve los días entre dos fechas, sin importar el orden', () => {
    const dias = getDateRange(new Date(2026, 9, 5), new Date(2026, 9, 2));

    expect(dias).toHaveLength(4);
    expect(toDateKey(dias[0])).toBe('2026-10-02');
    expect(toDateKey(dias[3])).toBe('2026-10-05');
  });
});

describe('isSameDay', () => {
  it('compara por día y no por instante', () => {
    expect(isSameDay(new Date(2026, 9, 5, 1), new Date(2026, 9, 5, 23))).toBe(true);
    expect(isSameDay(new Date(2026, 9, 5), new Date(2026, 9, 6))).toBe(false);
  });
});
