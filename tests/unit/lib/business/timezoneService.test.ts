import { afterEach, describe, expect, it, vi } from 'vitest';

// Casos caracterizados con la implementación anterior, incluidos ambos saltos DST.
const instantes = [
  ['2026-01-15T12:34:56Z', '2026-01-15 09:34:56'],
  ['2026-07-15T12:34:56Z', '2026-07-15 08:34:56'],
  ['2026-04-05T02:59:59Z', '2026-04-04 23:59:59'],
  ['2026-04-05T03:00:00Z', '2026-04-04 23:00:00'],
  ['2026-09-06T03:59:59Z', '2026-09-05 23:59:59'],
  ['2026-09-06T04:00:00Z', '2026-09-06 01:00:00'],
  ['2024-02-29T00:00:00Z', '2024-02-28 21:00:00']
] as const;
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('fechas de negocio al reutilizar el formateador', () => {
  it.each(instantes)('mantiene %s → %s', async (input, esperado) => {
    vi.resetModules();
    const { getNowInBusinessTimezone: format } = await import('@/lib/business/timezoneService');
    expect(format(input)).toBe(esperado);
    expect(format(new Date(input))).toBe(esperado);
    expect(format(Date.parse(input))).toBe(esperado);
  });
  it('procesa cada fecha por separado y crea un solo formateador para la misma zona', async () => {
    vi.resetModules();
    const Original = Intl.DateTimeFormat;
    const constructor = vi
      .spyOn(Intl, 'DateTimeFormat')
      .mockImplementation((locales, options) => new Original(locales, options));
    const { getNowInBusinessTimezone: format } = await import('@/lib/business/timezoneService');
    expect(constructor).not.toHaveBeenCalled();
    for (let i = 0; i < 20; i++)
      for (const [input, esperado] of instantes) expect(format(input)).toBe(esperado);
    expect(constructor).toHaveBeenCalledTimes(1);
  });
  it('conserva la fecha actual para entradas vacías, cero e inválidas', async () => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:34:56Z'));
    const { getNowInBusinessTimezone: format } = await import('@/lib/business/timezoneService');
    for (const input of [undefined, '', 0, 'fecha inválida', new Date(NaN)])
      expect(format(input)).toBe('2026-01-15 09:34:56');
    vi.setSystemTime(new Date('2026-07-15T12:34:56Z'));
    expect(format()).toBe('2026-07-15 08:34:56');
  });
  it('conserva el desfase por fecha y la prioridad de DB_TZ', async () => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.stubEnv('DB_TZ', '');
    const { getSQLTimezoneOffset: offset, getNowInBusinessTimezone: format } =
      await import('@/lib/business/timezoneService');
    vi.setSystemTime(new Date('2026-01-15T12:34:56Z'));
    format();
    expect(offset()).toBe('-03:00');
    vi.setSystemTime(new Date('2026-07-15T12:34:56Z'));
    format();
    expect(offset()).toBe('-04:00');
    vi.stubEnv('DB_TZ', 'Z');
    expect(offset()).toBe('+00:00');
    vi.stubEnv('DB_TZ', '-05:00');
    expect(offset()).toBe('-05:00');
  });
  it('no conserva un intento fallido de crear el formateador', async () => {
    vi.resetModules();
    const error = new RangeError('formatter unavailable');
    const Original = Intl.DateTimeFormat;
    const constructor = vi
      .spyOn(Intl, 'DateTimeFormat')
      .mockImplementation((locales, options) => new Original(locales, options))
      .mockImplementationOnce(() => {
        throw error;
      });
    const { getNowInBusinessTimezone: format } = await import('@/lib/business/timezoneService');
    expect(() => format(instantes[0][0])).toThrow(error);
    expect(format(instantes[0][0])).toBe(instantes[0][1]);
    expect(constructor).toHaveBeenCalledTimes(2);
  });
});
