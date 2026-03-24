export const toDateKey = (value?: string | Date | null) => {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return value.split('T')[0];
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
  const today = new Date();
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

export const getTodayDateKey = () => toDateKey(new Date());

export const buildExportFilename = (prefix: string, extension: 'xlsx' | 'pdf') =>
  `${prefix}_${getTodayDateKey()}.${extension}`;

export const getMonthPeriodKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const getCurrentTimeKey = () => new Date().toTimeString().slice(0, 8);

export const formatMonthYearLabel = (date: Date, locale = 'es-ES') =>
  date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

export const formatLongDateEs = (value: string | Date, locale = 'es-ES') =>
  new Date(value).toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

export const formatShortTimeEs = (value: string | Date, locale = 'es-ES') =>
  new Date(value).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });

export const formatShortDateEs = (value: string | Date, locale = 'es-ES') =>
  new Date(value).toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
  });

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
