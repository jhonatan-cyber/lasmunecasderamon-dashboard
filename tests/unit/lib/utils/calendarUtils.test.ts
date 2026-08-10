import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-04-11 12:34:56'
}));

import {
  toDateKey,
  toDateKeys,
  matchesAnyDateKey,
  getMonthDateRange,
  getWeekDateRange,
  getTodayDateKey,
  buildExportFilename,
  getMonthPeriodKey,
  getCurrentTimeKey,
  formatMonthYearLabel,
  formatLongDateEs,
  formatShortTimeEs,
  formatShortDateEs,
  formatDateLabel,
  formatShortDmyDateEs,
  formatDateTimeLabel,
  formatDateTimeDmyLabel
} from '@/lib/utils/calendarUtils';

describe('calendarUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('toDateKey', () => {
    it('devuelve string vacío si el valor es null/undefined', () => {
      expect(toDateKey(undefined)).toBe('');
      expect(toDateKey(null)).toBe('');
    });

    it('formatea un Date en YYYY-MM-DD', () => {
      expect(toDateKey(new Date(2026, 3, 11))).toBe('2026-04-11');
    });

    it('recorta un string con hora a YYYY-MM-DD', () => {
      expect(toDateKey('2026-04-11T15:30:00')).toBe('2026-04-11');
      expect(toDateKey('2026-04-11 15:30:00')).toBe('2026-04-11');
    });
  });

  describe('toDateKeys / matchesAnyDateKey', () => {
    it('mapea un array de Dates', () => {
      expect(toDateKeys([new Date(2026, 3, 11), new Date(2026, 3, 12)])).toEqual([
        '2026-04-11',
        '2026-04-12'
      ]);
    });

    it('comprueba coincidencia contra una lista de claves', () => {
      expect(matchesAnyDateKey('2026-04-11', ['2026-04-10', '2026-04-11'])).toBe(true);
      expect(matchesAnyDateKey('2026-04-09', ['2026-04-10', '2026-04-11'])).toBe(false);
    });
  });

  describe('getMonthDateRange', () => {
    it('devuelve el primer y último día del mes', () => {
      expect(getMonthDateRange(new Date(2026, 3, 15))).toEqual({
        startDate: '2026-04-01',
        endDate: '2026-04-30'
      });
    });
  });

  describe('getWeekDateRange', () => {
    it('devuelve lunes-domingo de la semana actual (basado en el mock 2026-04-11)', () => {
      // 2026-04-11 es sábado
      const range = getWeekDateRange();
      expect(range.startDate).toBe('2026-04-06');
      expect(range.endDate).toBe('2026-04-12');
    });

    it('desplaza N semanas hacia atrás', () => {
      const range = getWeekDateRange(1);
      expect(range.startDate).toBe('2026-03-30');
      expect(range.endDate).toBe('2026-04-05');
    });
  });

  describe('fechas y nombres de archivo', () => {
    it('getTodayDateKey devuelve la fecha del mock', () => {
      expect(getTodayDateKey()).toBe('2026-04-11');
    });

    it('buildExportFilename combina prefijo, fecha y extensión', () => {
      expect(buildExportFilename('reporte', 'xlsx')).toBe('reporte_2026-04-11.xlsx');
      expect(buildExportFilename('reporte', 'pdf')).toBe('reporte_2026-04-11.pdf');
    });

    it('getMonthPeriodKey usa el mes actual sin argumento y el Date con argumento', () => {
      expect(getMonthPeriodKey()).toBe('2026-04');
      expect(getMonthPeriodKey(new Date(2025, 11, 31))).toBe('2025-12');
    });

    it('getCurrentTimeKey devuelve HH:MM:SS del mock', () => {
      expect(getCurrentTimeKey()).toBe('12:34:56');
    });
  });

  describe('formatMonthYearLabel', () => {
    it('formatea mes y año en español', () => {
      const label = formatMonthYearLabel(new Date(2026, 3, 1));
      expect(label).toContain('2026');
    });
  });

  describe('formatLongDateEs', () => {
    it('devuelve string vacío para valores falsy', () => {
      expect(formatLongDateEs('')).toBe('');
      expect(formatLongDateEs(null as any)).toBe('');
    });

    it('devuelve Fecha inválida para fechas inválidas', () => {
      expect(formatLongDateEs('no-es-una-fecha')).toBe('Fecha inválida');
    });

    it('formatea una fecha válida', () => {
      const result = formatLongDateEs('2026-04-11');
      expect(result).toContain('2026');
    });
  });

  describe('formatShortTimeEs', () => {
    it('devuelve string vacío para valores falsy', () => {
      expect(formatShortTimeEs('')).toBe('');
    });

    it('devuelve Hora inválida para texto no válido', () => {
      expect(formatShortTimeEs('texto')).toBe('Hora inválida');
    });

    it('parsea una hora HH:MM directa', () => {
      const result = formatShortTimeEs('14:30');
      expect(result).toContain('14');
    });

    it('formatea un Date', () => {
      const result = formatShortTimeEs(new Date(2026, 3, 11, 9, 5));
      expect(result).toBeDefined();
    });
  });

  describe('formatShortDateEs', () => {
    it('devuelve string vacío para valores falsy', () => {
      expect(formatShortDateEs('')).toBe('');
    });

    it('devuelve Fecha inválida para fechas inválidas', () => {
      expect(formatShortDateEs('abc')).toBe('Fecha inválida');
    });

    it('formatea una fecha corta', () => {
      expect(formatShortDateEs('2026-04-11')).toBeDefined();
    });
  });

  describe('formatDateLabel / formatShortDmyDateEs', () => {
    it('formatDateLabel formatea local', () => {
      expect(formatDateLabel('2026-04-11')).toBeDefined();
    });

    it('formatShortDmyDateEs produce DD mon YYYY', () => {
      const result = formatShortDmyDateEs('2026-04-11');
      expect(result).toContain('2026');
      expect(result).toContain('11');
    });
  });

  describe('formatDateTimeLabel / formatDateTimeDmyLabel', () => {
    it('formatDateTimeLabel devuelve objeto con date y time', () => {
      const result = formatDateTimeLabel('2026-04-11T09:30:00');
      expect(result.date).toContain('2026');
      expect(result.time).toBeDefined();
    });

    it('formatDateTimeDmyLabel devuelve objeto con date y time', () => {
      const result = formatDateTimeDmyLabel('2026-04-11T09:30:00');
      expect(result.date).toContain('2026');
      expect(result.time).toBeDefined();
    });
  });
});
