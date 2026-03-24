
export const getSystemTimezone = (): string => {
  return 'America/Santiago';
};


export const getSQLTimezoneOffset = (): string => {
  if (process.env.DB_TZ) {
    return process.env.DB_TZ === 'Z' ? '+00:00' : process.env.DB_TZ;
  }

  try {
    const tz = getSystemTimezone();
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const getVal = (type: string) => parts.find(p => p.type === type)?.value || '0';
    const localDateText = `${getVal('year')}-${getVal('month')}-${getVal('day')}T${getVal('hour')}:${getVal('minute')}:${getVal('second')}Z`;
    const localDate = new Date(localDateText);
    const utcDate = new Date(now.toISOString());
    const diffMinutes = Math.round((localDate.getTime() - utcDate.getTime()) / 60000);
    const sign = diffMinutes >= 0 ? '+' : '-';
    const absMinutes = Math.abs(diffMinutes);
    const hours = Math.floor(absMinutes / 60);
    const minutes = absMinutes % 60;
    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  } catch (error) {
    return '-04:00';
  }
};

export const getNowInBusinessTimezone = (inputDate?: Date | string | number): string => {
  const tz = getSystemTimezone();
  const dateToProcess = inputDate ? new Date(inputDate) : new Date();
  const finalDate = isNaN(dateToProcess.getTime()) ? new Date() : dateToProcess;

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(finalDate);
  const getVal = (type: string) => parts.find(p => p.type === type)?.value || '00';

  return `${getVal('year')}-${getVal('month')}-${getVal('day')} ${getVal('hour')}:${getVal('minute')}:${getVal('second')}`;
};
