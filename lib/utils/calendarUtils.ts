import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
const parseDatePreservingLocalDate = (value: string | Date) => {
  if (value instanceof Date) return value;

  if (typeof value === 'string') {
    const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
  }

  return new Date(value);
};

/** Día local de un instante, en `YYYY-MM-DD`. */
const dateKeyDeInstante = (instante: Date) => {
  const year = instante.getFullYear();
  const month = String(instante.getMonth() + 1).padStart(2, '0');
  const day = String(instante.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Un texto con zona explícita (`Z` o `±hh:mm`) es un instante. */
const TIENE_ZONA_EXPLICITA = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/**
 * Clave de día de un calendario, con un solo criterio.
 *
 * Un texto con zona explícita es un **instante**: se traduce al día local, como
 * un `Date`. Un texto sin zona es la **hora de pared** (la que entrega la API)
 * y se lee tal cual, sin convertirla. Antes el texto con zona se leía por sus
 * primeros diez caracteres —el día UTC— y el `Date` por su día local: dos
 * criterios para lo mismo, que solo coincidían cuando la zona del proceso
 * era UTC.
 */
export const toDateKey = (value?: string | Date | null) => {
  if (!value) return '';
  if (value instanceof Date) return dateKeyDeInstante(value);
  const texto = value.trim();
  if (TIENE_ZONA_EXPLICITA.test(texto)) {
    const instante = new Date(texto);
    if (!isNaN(instante.getTime())) return dateKeyDeInstante(instante);
  }
  return texto.substring(0, 10).replace('T', ' ');
};

export const toDateKeys = (dates: Date[]) => dates.map(date => toDateKey(date));

export const matchesAnyDateKey = (value: string | Date | null | undefined, dateKeys: string[]) =>
  dateKeys.includes(toDateKey(value));

export const getMonthDateRange = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();

  return {
    startDate: toDateKey(new Date(year, month, 1)),
    endDate: toDateKey(new Date(year, month + 1, 0))
  };
};

export const getWeekDateRange = (offsetWeeks = 0) => {
  const todayStr = getNowInBusinessTimezone().substring(0, 10);
  const today = new Date(todayStr + 'T00:00:00');
  const dayOfWeek = today.getDay();
  const mondayThisWeek = new Date(today);
  mondayThisWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const mondayTarget = new Date(mondayThisWeek);
  mondayTarget.setDate(mondayThisWeek.getDate() - offsetWeeks * 7);

  const sundayTarget = new Date(mondayTarget);
  sundayTarget.setDate(mondayTarget.getDate() + 6);

  return {
    startDate: toDateKey(mondayTarget),
    endDate: toDateKey(sundayTarget)
  };
};

export const getTodayDateKey = () => getNowInBusinessTimezone().substring(0, 10);

export const buildExportFilename = (prefix: string, extension: 'xlsx' | 'pdf') =>
  `${prefix}_${getTodayDateKey()}.${extension}`;

export const getMonthPeriodKey = (date?: Date) => {
  if (date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  const now = getNowInBusinessTimezone();
  return now.substring(0, 7);
};

export const getCurrentTimeKey = () => getNowInBusinessTimezone().substring(11, 19);

export const formatMonthYearLabel = (date: Date, locale = 'es-ES') =>
  date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

export const formatLongDateEs = (value: string | Date, locale = 'es-ES') => {
  if (!value) return '';
  const date = parseDatePreservingLocalDate(value);
  if (isNaN(date.getTime())) return 'Fecha inválida';
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatShortTimeEs = (value: string | Date, locale = 'es-ES') => {
  if (!value) return '';

  if (
    typeof value === 'string' &&
    value.includes(':') &&
    !value.includes('-') &&
    !value.includes('T')
  ) {
    const parts = value.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);

    if (!isNaN(hours) && !isNaN(minutes)) {
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  const date = parseDatePreservingLocalDate(value);
  if (isNaN(date.getTime())) return 'Hora inválida';

  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatShortDateEs = (value: string | Date, locale = 'es-ES') => {
  if (!value) return '';
  const date = parseDatePreservingLocalDate(value);
  if (isNaN(date.getTime())) return 'Fecha inválida';
  return date.toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric'
  });
};

export const formatDateLabel = (value: string | Date, locale = 'es-ES') =>
  parseDatePreservingLocalDate(value).toLocaleDateString(locale);

export const formatShortDmyDateEs = (value: string | Date, locale = 'es-ES') => {
  const date = parseDatePreservingLocalDate(value);
  return `${date.getDate().toString().padStart(2, '0')} ${date.toLocaleDateString(locale, {
    month: 'short'
  })} ${date.getFullYear()}`;
};

export const formatDateTimeLabel = (value: string | Date, locale = 'es-ES') => {
  const date = parseDatePreservingLocalDate(value);
  return {
    date: date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }),
    time: date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit'
    })
  };
};

export const formatDateTimeDmyLabel = (value: string | Date, locale = 'es-ES') => {
  const date = parseDatePreservingLocalDate(value);
  return {
    date: `${date.getDate()}-${date.toLocaleDateString(locale, { month: 'long' })}-${date.getFullYear()}`,
    time: date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  };
};
