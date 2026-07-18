import { getNowInBusinessTimezone, parseBusinessDate } from '@/lib/business/timezoneService';
import type { CuentaRow, CuentaJoinRow, CuentaGetByIdRow, DetalleCuentaRow, CuentaUsuarioRow } from '../types';

export type CuentaRoomHistoryItem = {
  roomId: string;
  roomName: string;
  startedAt: string;
  endedAt: string | null;
  assignedMinutes: number;
  consumedMinutes: number;
  remainingMinutes?: number;
  carriedFromPrevious?: boolean;
  closedReason?: 'expired' | 'manual' | 'charged' | 'cancelled' | 'changed_room';
};

export type CuentaRoomHistoryViewItem = CuentaRoomHistoryItem & {
  remainingMinutes: number;
  isActive: boolean;
};

export function parseRoomHistory(raw: unknown): CuentaRoomHistoryItem[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function stringifyRoomHistory(history: CuentaRoomHistoryItem[]): string | null {
  return history.length ? JSON.stringify(history) : null;
}

export function getCurrentTimerDuration(cuenta: CuentaRow | CuentaJoinRow | CuentaGetByIdRow | null): number {
  if (cuenta && Object.prototype.hasOwnProperty.call(cuenta, 'tiempo_actual')) {
    const current = Number(cuenta?.tiempo_actual);
    return Number.isFinite(current) ? Math.max(0, current) : 0;
  }
  return Number(cuenta?.tiempo || 0);
}

export function getCurrentTimerStart(cuenta: CuentaRow | CuentaJoinRow | CuentaGetByIdRow | null): string | null {
  if (cuenta && Object.prototype.hasOwnProperty.call(cuenta, 'tiempo_inicio_actual')) {
    return cuenta?.tiempo_inicio_actual || null;
  }
  return cuenta?.fecha_crea || null;
}

export function getRemainingMinutes(cuenta: CuentaRow | CuentaJoinRow | CuentaGetByIdRow | null, nowObj: Date) {
  const duration = getCurrentTimerDuration(cuenta);
  const start = getCurrentTimerStart(cuenta);
  if (!duration || !start) return { remainingMinutes: 0, elapsedMinutes: 0, isActive: false };

  const startObj = parseBusinessDate(start);
  const elapsedSeconds = Math.max(0, Math.floor((nowObj.getTime() - startObj.getTime()) / 1000));
  const remainingSeconds = Math.max(0, duration * 60 - elapsedSeconds);

  return {
    remainingMinutes: Math.ceil(remainingSeconds / 60),
    elapsedMinutes: Math.min(duration, Math.ceil(elapsedSeconds / 60)),
    isActive: remainingSeconds > 0
  };
}

export function ensureOpenHistorySegment(
  history: CuentaRoomHistoryItem[],
  cuenta: CuentaRow | CuentaJoinRow | CuentaGetByIdRow | null,
  roomName: string
): CuentaRoomHistoryItem[] {
  if (!cuenta?.habitacion_id) return history;
  const hasOpen = history.some(item => item.endedAt === null);
  if (hasOpen) return history;

  const duration = getCurrentTimerDuration(cuenta);
  if (duration <= 0) return history;

  return [
    ...history,
    {
      roomId: String(cuenta.habitacion_id),
      roomName,
      startedAt: getCurrentTimerStart(cuenta) || getNowInBusinessTimezone(),
      endedAt: null,
      assignedMinutes: duration,
      consumedMinutes: 0
    }
  ];
}

export function closeOpenHistorySegment(
  history: CuentaRoomHistoryItem[],
  nowStr: string,
  elapsedMinutes: number,
  markAsCompleted = false,
  closedReason: CuentaRoomHistoryItem['closedReason'] = 'manual'
): CuentaRoomHistoryItem[] {
  const next = [...history];
  const openIndex = [...next].reverse().findIndex(item => item.endedAt === null);
  if (openIndex === -1) return next;

  const index = next.length - 1 - openIndex;
  const current = next[index];
  const assignedMinutes = Number(current.assignedMinutes || 0);
  const consumedMinutes = markAsCompleted
    ? assignedMinutes
    : Math.min(assignedMinutes, Math.max(0, elapsedMinutes));

  next[index] = {
    ...current,
    endedAt: nowStr,
    consumedMinutes,
    remainingMinutes: Math.max(0, assignedMinutes - consumedMinutes),
    closedReason
  };
  return next;
}

export function appendHistorySegment(
  history: CuentaRoomHistoryItem[],
  roomId: string,
  roomName: string,
  nowStr: string,
  assignedMinutes: number,
  carriedFromPrevious = false
): CuentaRoomHistoryItem[] {
  return [
    ...history,
    {
      roomId: String(roomId),
      roomName,
      startedAt: nowStr,
      endedAt: null,
      assignedMinutes: Number(assignedMinutes || 0),
      consumedMinutes: 0,
      remainingMinutes: Number(assignedMinutes || 0),
      carriedFromPrevious
    }
  ];
}

export function normalizeCuentaRow(
  cuenta:
    | (CuentaJoinRow & { detalles?: DetalleCuentaRow[]; usuarios?: CuentaUsuarioRow[] })
    | (CuentaGetByIdRow & { detalles?: DetalleCuentaRow[]; usuarios?: CuentaUsuarioRow[] })
    | null
) {
  if (!cuenta) return cuenta;
  const history = hydrateRoomHistory(parseRoomHistory(cuenta.habitaciones_historial));
  return {
    ...cuenta,
    tiempo_total: Number(cuenta.tiempo_total ?? cuenta.tiempo ?? 0),
    tiempo_activo: Number(cuenta.tiempo_activo ?? cuenta.tiempo_actual ?? cuenta.tiempo ?? 0),
    habitaciones_historial_data: history
  };
}

export function hydrateRoomHistory(
  history: CuentaRoomHistoryItem[],
  nowStr = getNowInBusinessTimezone()
): CuentaRoomHistoryViewItem[] {
  const nowObj = parseBusinessDate(nowStr);

  return history.map(item => {
    const assignedMinutes = Number(item.assignedMinutes || 0);
    let consumedMinutes = Math.max(0, Number(item.consumedMinutes || 0));
    let remainingMinutes = Math.max(0, Number(item.remainingMinutes ?? assignedMinutes - consumedMinutes));

    if (item.startedAt) {
      const startedAt = parseBusinessDate(item.startedAt);

      if (!item.endedAt) {
        const elapsedMinutes = Math.max(0, Math.ceil((nowObj.getTime() - startedAt.getTime()) / 60000));
        consumedMinutes = Math.min(assignedMinutes, elapsedMinutes);
        remainingMinutes = Math.max(0, assignedMinutes - consumedMinutes);
      } else {
        const endedAt = parseBusinessDate(item.endedAt);
        const elapsedMinutes = Math.max(0, Math.ceil((endedAt.getTime() - startedAt.getTime()) / 60000));

        if (!Number.isFinite(consumedMinutes) || consumedMinutes <= 0 || remainingMinutes >= assignedMinutes) {
          consumedMinutes = Math.min(assignedMinutes, elapsedMinutes);
          remainingMinutes = Math.max(0, assignedMinutes - consumedMinutes);
        }
      }
    }

    consumedMinutes = Math.min(assignedMinutes, Math.max(0, consumedMinutes));
    remainingMinutes = Math.max(0, Math.min(assignedMinutes, remainingMinutes));

    return {
      ...item,
      assignedMinutes,
      consumedMinutes,
      remainingMinutes,
      isActive: !item.endedAt && remainingMinutes > 0
    };
  });
}
