/**
 * Utilidades compartidas para manejo de tiempos y temporizadores.
 */

/**
 * Parsea una fecha del backend de forma segura y maneja desfases de zona horaria.
 * Asume UTC si no hay indicador de zona horaria.
 */
export const parseDateSafe = (dateStr: any): Date => {
  if (!dateStr) return new Date();
  if (typeof dateStr !== 'string') return new Date(dateStr);
  
  // Si ya tiene indicador de zona horaria (Z o +/-), dejar que el constructor la maneje
  if (dateStr.includes('Z') || dateStr.includes('+')) return new Date(dateStr);
  
  try {
    // Si no tiene 'Z', asumimos que es UTC (formato de MySQL con TZ=UTC)
    const utcDateStr = dateStr.includes('T') ? dateStr + 'Z' : dateStr.replace(' ', 'T') + 'Z';
    const date = new Date(utcDateStr);
    if (!isNaN(date.getTime())) return date;
    
    // Fallback: tratar de limpiar y parsear
    const cleanDate = dateStr.replace('T', ' ').replace(/-/g, '/');
    const fallbackDate = new Date(cleanDate);
    if (isNaN(fallbackDate.getTime())) return new Date(dateStr);
    return fallbackDate;
  } catch (e) {
    return new Date(dateStr);
  }
};

/**
 * Calcula el tiempo restante de un temporizador en segundos.
 */
export const calculateRemainingTime = (
  timer: { startTime: Date | string; duration: number; isPaused: boolean; remainingTime: number },
  serverOffset: number = 0
): number => {
  if (timer.isPaused) {
    return timer.remainingTime;
  }

  const start = typeof timer.startTime === 'string' ? parseDateSafe(timer.startTime) : timer.startTime;
  const now = new Date(Date.now() + serverOffset);
  
  // Si por desfase horario el startTime quedara en el futuro, evitamos problemas
  const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));
  const totalDurationSeconds = timer.duration * 60;
  const remaining = totalDurationSeconds - elapsedSeconds;

  return Math.max(0, remaining);
};

/**
 * Formatea segundos en formato MM:SS
 */
export const formatTime = (seconds: number): string => {
  const absSeconds = Math.abs(seconds);
  const minutes = Math.floor(absSeconds / 60);
  const remainingSeconds = Math.floor(absSeconds % 60);
  return `${seconds < 0 ? '-' : ''}${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};
