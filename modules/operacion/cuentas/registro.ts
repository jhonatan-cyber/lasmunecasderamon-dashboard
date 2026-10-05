import type { TransactionQuery } from '@/lib/database/db';
import {
  CuentaQueries,
  type CuentaDetalle,
  type CuentaCreateBody,
  type CuentaUpdateBody,
  type CuentaCobrarBody
} from '@/modules/operacion/cuentas/consultas';
import {
  detenerTemporizadorCuenta,
  solicitarAnulacionCuenta
} from '@/modules/operacion/cuentas/servicio';
import { actualizarCuenta } from '@/modules/operacion/cuentas/servicio';
import { crearCuenta } from '@/modules/operacion/cuentas/servicio';
import {
  listarCuentas,
  finalizarSesionHabitacion,
  eliminarCuenta
} from '@/modules/operacion/cuentas/servicio';
import type {
  CuentaRoomHistoryItem,
  CuentaRoomHistoryViewItem
} from '@/modules/operacion/cuentas/historial';

export type {
  CuentaDetalle,
  CuentaCreateBody,
  CuentaUpdateBody,
  CuentaCobrarBody,
  CuentaRoomHistoryItem,
  CuentaRoomHistoryViewItem
};

export class CuentaRepository {
  static async finalizeRoomSession(id: string, nowStr?: string) {
    return await finalizarSesionHabitacion(id, nowStr);
  }

  static async getAll(tipo?: string, estado?: string) {
    return await listarCuentas(tipo, estado);
  }

  static async getById(id: string) {
    return await CuentaQueries.getById(id);
  }

  static async create(body: CuentaCreateBody, createdBy: string) {
    const id = await crearCuenta(body, createdBy);
    return await CuentaQueries.getById(id);
  }

  static async updateCuenta(id: string, body: CuentaUpdateBody, createdBy: string) {
    await actualizarCuenta(id, body, createdBy);
    return await CuentaQueries.getById(id);
  }

  static async cobrar(id: string, body: CuentaCobrarBody, cobradoPor: string) {
    return await CuentaQueries.cobrar(id, body, cobradoPor);
  }

  static async stopTimer(id: string, userId: string) {
    await detenerTemporizadorCuenta(id);
    return await CuentaQueries.getById(id);
  }

  static async requestAnulacion(
    id: string,
    reason: string,
    requestedBy: string,
    requestedAmount: number
  ): Promise<string> {
    return await solicitarAnulacionCuenta(id, reason, requestedBy, requestedAmount);
  }

  static async delete(id: string) {
    return await eliminarCuenta(id);
  }
}
