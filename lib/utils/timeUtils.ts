export const parseDateSafe = (dateStr: string | number | Date | null | undefined): Date => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  if (typeof dateStr === 'number') return new Date(dateStr);

  if (typeof dateStr !== 'string') return new Date(dateStr);

  if (dateStr.includes('Z') || dateStr.includes('+')) return new Date(dateStr);

  try {
    const cleanDateStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
    const date = new Date(cleanDateStr);

    if (!isNaN(date.getTime())) return date;
    return new Date(dateStr);
  } catch {
    return new Date(dateStr);
  }
};

export const calculateRemainingTime = (
  timer: { startTime: Date | string; duration: number; isPaused: boolean; remainingTime: number },
  serverOffset: number = 0
): number => {
  if (timer.isPaused) {
    return timer.remainingTime;
  }

  const start =
    typeof timer.startTime === 'string' ? parseDateSafe(timer.startTime) : timer.startTime;
  const now = new Date(Date.now() + serverOffset);

  const diffMs = now.getTime() - start.getTime();
  const elapsedSeconds = Math.floor(diffMs / 1000);

  const totalDurationSeconds = (Number(timer.duration) || 0) * 60;

  const remaining = totalDurationSeconds - elapsedSeconds;

  return isNaN(remaining) ? 0 : Math.max(0, remaining);
};

export const formatTime = (seconds: number): string => {
  const absSeconds = Math.abs(seconds);
  const minutes = Math.floor(absSeconds / 60);
  const remainingSeconds = Math.floor(absSeconds % 60);
  return `${seconds < 0 ? '-' : ''}${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};
