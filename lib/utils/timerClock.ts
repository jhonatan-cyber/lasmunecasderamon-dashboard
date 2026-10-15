// Ancla UTC del servidor; el avance no depende de ajustes del reloj del equipo.
let anchor: { utc: number; monotonic: number } | undefined;

export function synchronizeTimerClock(serverTime: string, receivedAt = performance.now()) {
  const utc = Date.parse(serverTime);
  if (!Number.isFinite(utc)) throw new Error('Hora de servidor invalida');
  anchor = { utc, monotonic: receivedAt };
  return utc - Date.now();
}

export function timerNow(offset = 0): number {
  return anchor ? anchor.utc + performance.now() - anchor.monotonic : Date.now() + offset;
}

export function resetTimerClock() {
  anchor = undefined;
}

export function hasSynchronizedTimerClock(): boolean {
  return anchor !== undefined;
}
