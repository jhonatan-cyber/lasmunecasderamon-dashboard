const relativeTime = new Intl.RelativeTimeFormat('es-CL', {
  numeric: 'auto',
  style: 'short'
});

export function formatRelativeTimestamp(timestamp: string, now = Date.now()): string {
  const date = Date.parse(timestamp);
  if (!Number.isFinite(date)) return 'fecha desconocida';

  const seconds = Math.round((date - now) / 1000);
  if (Math.abs(seconds) < 60) return 'ahora';
  if (Math.abs(seconds) < 60 * 60) return relativeTime.format(Math.round(seconds / 60), 'minute');
  if (Math.abs(seconds) < 24 * 60 * 60)
    return relativeTime.format(Math.round(seconds / (60 * 60)), 'hour');
  return relativeTime.format(Math.round(seconds / (24 * 60 * 60)), 'day');
}
