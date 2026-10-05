import { enUnaUnidad } from '@/lib/transaccion/contrato';
import { ejecutarEfectosConfirmados } from '@/lib/transaccion/efectos';
import { cobrarCuenta, consultarCuentaCobrada } from '@/modules/operacion/cobro/servicio';
import {
  detenerTemporizadorCuenta,
  solicitarAnulacionCuenta as solicitarAnulacionCuentaOperacion,
  actualizarCuenta,
  crearCuenta,
  listarCuentas,
  finalizarSesionHabitacion,
  eliminarCuenta
} from '@/modules/operacion/cuentas/servicio';
import { query, withTransaction } from '@/lib/database/db';
import { getNowInBusinessTimezone, parseBusinessDate } from '@/lib/business/timezoneService';
import { BaseRepository } from '@/lib/database/base-repository';
import { NotFoundError, BusinessError } from '@/lib/errors/errors';
import {
  buildFinancialSummary,
  type CuentaAnulacionRow
} from '@/modules/operacion/cuentas/resumen';
import type {
  CuentaRow,
  CuentaJoinRow,
  CuentaGetByIdRow,
  CuentaTotalesRow,
  CuentaResumenRow,
  DetalleCuentaRow,
  CuentaUsuarioRow,
  HabitacionRow,
  ClienteRow
} from '@/lib/database/rows';

export type CuentaDetalle = {
  producto_id: string;
  precio: number;
  cantidad: number;
  sub_total: number;
  comision: number;
  hostesses?: (string | null)[];
  isChampagne?: boolean;
};

export type CuentaCreateBody = {
  codigo: string;
  cliente_id?: string | null;
  total_comision: number;
  habitacion_id?: string | null;
  habitacion_nombre?: string;
  sub_total: number;
  total: number;
  propina?: number;
  tiempo?: number;
  detalles: CuentaDetalle[];
  usuarios?: string[];
};

export type CuentaUpdateBody = {
  estado?: number;
  detalles?: CuentaDetalle[];
  usuarios?: string[];
  extraTiempo?: number;
  habitacion_id?: string | null;
  tiempo?: number;
};

import type { CuentaCobrarBody } from '@/modules/operacion/contracts';
export type { CuentaCobrarBody } from '@/modules/operacion/contracts';

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

export class CuentaQueries {
  private static readonly TABLE = 'cuentas';
  private static readonly ID_COL = 'id_cuenta';

  static parseRoomHistory(raw: unknown): CuentaRoomHistoryItem[] {
    if (!raw) return [];
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static stringifyRoomHistory(history: CuentaRoomHistoryItem[]): string | null {
    return history.length ? JSON.stringify(history) : null;
  }

  static getCurrentTimerDuration(
    cuenta: CuentaRow | CuentaJoinRow | CuentaGetByIdRow | null
  ): number {
    if (cuenta && Object.prototype.hasOwnProperty.call(cuenta, 'tiempo_actual')) {
      const current = Number(cuenta?.tiempo_actual);
      return Number.isFinite(current) ? Math.max(0, current) : 0;
    }

    return Number(cuenta?.tiempo || 0);
  }

  static getCurrentTimerStart(
    cuenta: CuentaRow | CuentaJoinRow | CuentaGetByIdRow | null
  ): string | null {
    if (cuenta && Object.prototype.hasOwnProperty.call(cuenta, 'tiempo_inicio_actual')) {
      return cuenta?.tiempo_inicio_actual || null;
    }

    return cuenta?.fecha_crea || null;
  }

  static getRemainingMinutes(
    cuenta: CuentaRow | CuentaJoinRow | CuentaGetByIdRow | null,
    nowObj: Date
  ) {
    const duration = this.getCurrentTimerDuration(cuenta);
    const start = this.getCurrentTimerStart(cuenta);
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

  static ensureOpenHistorySegment(
    history: CuentaRoomHistoryItem[],
    cuenta: CuentaRow | CuentaJoinRow | CuentaGetByIdRow | null,
    roomName: string
  ): CuentaRoomHistoryItem[] {
    if (!cuenta?.habitacion_id) return history;
    const hasOpen = history.some(item => item.endedAt === null);
    if (hasOpen) return history;

    const duration = this.getCurrentTimerDuration(cuenta);
    if (duration <= 0) return history;

    return [
      ...history,
      {
        roomId: String(cuenta.habitacion_id),
        roomName,
        startedAt: this.getCurrentTimerStart(cuenta) || getNowInBusinessTimezone(),
        endedAt: null,
        assignedMinutes: duration,
        consumedMinutes: 0
      }
    ];
  }

  static closeOpenHistorySegment(
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

  static appendHistorySegment(
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

  static normalizeCuentaRow(
    cuenta:
      | (CuentaJoinRow & { detalles?: DetalleCuentaRow[]; usuarios?: CuentaUsuarioRow[] })
      | (CuentaGetByIdRow & { detalles?: DetalleCuentaRow[]; usuarios?: CuentaUsuarioRow[] })
      | null
  ) {
    if (!cuenta) return cuenta;
    const history = this.hydrateRoomHistory(this.parseRoomHistory(cuenta.habitaciones_historial));
    return {
      ...cuenta,
      tiempo_total: Number(cuenta.tiempo_total ?? cuenta.tiempo ?? 0),
      tiempo_activo: Number(cuenta.tiempo_activo ?? cuenta.tiempo_actual ?? cuenta.tiempo ?? 0),
      habitaciones_historial_data: history
    };
  }

  static hydrateRoomHistory(
    history: CuentaRoomHistoryItem[],
    nowStr = getNowInBusinessTimezone()
  ): CuentaRoomHistoryViewItem[] {
    const nowObj = parseBusinessDate(nowStr);

    return history.map(item => {
      const assignedMinutes = Number(item.assignedMinutes || 0);
      let consumedMinutes = Math.max(0, Number(item.consumedMinutes || 0));
      let remainingMinutes = Math.max(
        0,
        Number(item.remainingMinutes ?? assignedMinutes - consumedMinutes)
      );

      if (item.startedAt) {
        const startedAt = parseBusinessDate(item.startedAt);

        if (!item.endedAt) {
          const elapsedMinutes = Math.max(
            0,
            Math.ceil((nowObj.getTime() - startedAt.getTime()) / 60000)
          );
          consumedMinutes = Math.min(assignedMinutes, elapsedMinutes);
          remainingMinutes = Math.max(0, assignedMinutes - consumedMinutes);
        } else {
          const endedAt = parseBusinessDate(item.endedAt);
          const elapsedMinutes = Math.max(
            0,
            Math.ceil((endedAt.getTime() - startedAt.getTime()) / 60000)
          );

          if (
            !Number.isFinite(consumedMinutes) ||
            consumedMinutes <= 0 ||
            remainingMinutes >= assignedMinutes
          ) {
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

  static async finalizeRoomSession(id: string, nowStr = getNowInBusinessTimezone()) {
    return await finalizarSesionHabitacion(id, nowStr);
  }

  static async getAll(tipo?: string, estado?: string) {
    return await listarCuentas(tipo, estado);
  }

  static async getById(id: string) {
    return enUnaUnidad(unidad => unidad.ejecutar(contexto => consultarCuentaCobrada(id, contexto)));
  }

  static async create(body: CuentaCreateBody, createdBy: string) {
    const id = await crearCuenta(body, createdBy);
    return await this.getById(id);
  }

  static async updateCuenta(id: string, body: CuentaUpdateBody, createdBy: string) {
    await actualizarCuenta(id, body, createdBy);
    return await this.getById(id);
  }

  static async cobrar(id: string, body: CuentaCobrarBody, cobradoPor: string) {
    const tareas: Array<() => void | Promise<void>> = [];
    await enUnaUnidad(unidad =>
      unidad.ejecutar(contexto =>
        cobrarCuenta(id, body, cobradoPor, contexto, tarea => {
          tareas.push(tarea);
        })
      )
    );
    await ejecutarEfectosConfirmados(tareas);
    return this.getById(id);
  }

  static async stopTimer(id: string, userId: string) {
    await detenerTemporizadorCuenta(id);
    return await this.getById(id);
  }

  static async requestAnulacion(
    id: string,
    reason: string,
    requestedBy: string,
    requestedAmount: number
  ): Promise<string> {
    return await solicitarAnulacionCuentaOperacion(id, reason, requestedBy, requestedAmount);
  }

  static async delete(id: string) {
    return await eliminarCuenta(id);
  }
}
