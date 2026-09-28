import type { TransactionQuery } from '@/lib/database/db';
import {
  CuentaQueries,
  type CuentaDetalle,
  type CuentaCreateBody,
  type CuentaUpdateBody,
  type CuentaCobrarBody
} from './cuenta/CuentaQueries';
import type { CuentaRoomHistoryItem, CuentaRoomHistoryViewItem } from './cuenta/CuentaRoomHistory';

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
    return await CuentaQueries.finalizeRoomSession(id, nowStr);
  }

  static async getAll(tipo?: string, estado?: string) {
    return await CuentaQueries.getAll(tipo, estado);
  }

  static async getById(id: string) {
    return await CuentaQueries.getById(id);
  }

  static async create(body: CuentaCreateBody, createdBy: string) {
    return await CuentaQueries.create(body, createdBy);
  }

  static async updateCuenta(id: string, body: CuentaUpdateBody, createdBy: string) {
    return await CuentaQueries.updateCuenta(id, body, createdBy);
  }

  static async cobrar(id: string, body: CuentaCobrarBody, cobradoPor: string) {
    return await CuentaQueries.cobrar(id, body, cobradoPor);
  }

  /** Cobro dentro de una transacción existente (ver `AccountService.cobrarConVenta`). */
  static async cobrarEnTransaccion(
    trx: TransactionQuery,
    id: string,
    body: CuentaCobrarBody,
    cobradoPor: string,
    onAfterCommit?: (task: () => void | Promise<void>) => void
  ) {
    return await CuentaQueries.cobrarEnTransaccion(trx, id, body, cobradoPor, onAfterCommit);
  }

  static async stopTimer(id: string, userId: string) {
    return await CuentaQueries.stopTimer(id, userId);
  }

  static async requestAnulacion(
    id: string,
    reason: string,
    requestedBy: string,
    requestedAmount: number
  ): Promise<string> {
    return await CuentaQueries.requestAnulacion(id, reason, requestedBy, requestedAmount);
  }

  static async delete(id: string) {
    return await CuentaQueries.delete(id);
  }
}
