import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

export const toDateKey = (value?: string | Date | null) => {
  if (!value) return '';
  if (value instanceof Date) {
    // Usar formato local para evitar desfases de zona horaria
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return value.substring(0, 10).replace('T', ' '); // Normalizar a YYYY-MM-DD
};

export const toDateKeys = (dates: Date[]) => dates.map(date => toDateKey(date));

export const matchesDateKey = (value: string | Date | null | undefined, dateKey: string) =>
  toDateKey(value) === dateKey;

export const matchesAnyDateKey = (value: string | Date | null | undefined, dateKeys: string[]) =>
  dateKeys.includes(toDateKey(value));

export const getMonthDateRange = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();

  return {
    startDate: toDateKey(new Date(year, month, 1)),
    endDate: toDateKey(new Date(year, month + 1, 0)),
  };
};

export const getWeekDateRange = (offsetWeeks = 0) => {
  // Use business timezone to get the correct "today"
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
    endDate: toDateKey(sundayTarget),
  };
};

export const getTodayDateKey = () => getNowInBusinessTimezone().substring(0, 10);

export const buildExportFilename = (prefix: string, extension: 'xlsx' | 'pdf') =>
  `${prefix}_${getTodayDateKey()}.${extension}`;

export const getMonthPeriodKey = (date?: Date) => {
  if (date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  const now = getNowInBusinessTimezone(); // "YYYY-MM-DD HH:MM:SS"
  return now.substring(0, 7); // "YYYY-MM"
};

export const getCurrentTimeKey = () => getNowInBusinessTimezone().substring(11, 19);

export const formatMonthYearLabel = (date: Date, locale = 'es-ES') =>
  date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

export const formatLongDateEs = (value: string | Date, locale = 'es-ES') => {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return 'Fecha inválida';
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatShortTimeEs = (value: string | Date, locale = 'es-ES') => {
  if (!value) return '';
  
  if (typeof value === 'string' && value.includes(':') && !value.includes('-') && !value.includes('T')) {
    // If it's a time-only string like "HH:MM:SS" or "HH:MM"
    const parts = value.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    
    if (!isNaN(hours) && !isNaN(minutes)) {
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) return 'Hora inválida';

  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatShortDateEs = (value: string | Date, locale = 'es-ES') => {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return 'Fecha inválida';
  return date.toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
  });
};

export const formatDateLabel = (value: string | Date, locale = 'es-ES') =>
  new Date(value).toLocaleDateString(locale);

export const formatShortDmyDateEs = (value: string | Date, locale = 'es-ES') => {
  const date = new Date(value);
  return `${date.getDate().toString().padStart(2, '0')} ${date.toLocaleDateString(locale, {
    month: 'short',
  })} ${date.getFullYear()}`;
};

export const formatDateTimeLabel = (value: string | Date, locale = 'es-ES') => {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    time: date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
};

export const formatDateTimeDmyLabel = (value: string | Date, locale = 'es-ES') => {
  const date = new Date(value);
  return {
    date: `${date.getDate()}-${date.toLocaleDateString(locale, { month: 'long' })}-${date.getFullYear()}`,
    time: date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  };
};
