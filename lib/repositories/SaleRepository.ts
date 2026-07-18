import { SaleQueries } from './sale/SaleQueries';
import { type MixedPayment, type AllocationRow, type VentaRefundDetailRow } from './sale/saleHelpers';
import { type SaleType } from '@/lib/business/schemas';
import { type query, type TransactionQuery } from '@/lib/database/db';

export type { MixedPayment, AllocationRow, VentaRefundDetailRow };

export class SaleRepository {
  static async approveAnulacion(
    ventaId: string,
    approvedBy: string,
    requestedAmount: number
  ): Promise<SaleType | null> {
    return await SaleQueries.approveAnulacion(ventaId, approvedBy, requestedAmount);
  }

  static async getAll(params: {
    tipo?: string;
    page?: string;
    limit?: string;
    estado?: string;
    caja_id?: string;
    search?: string;
  }): Promise<any> {
    return await SaleQueries.getAll(params);
  }

  static async rawInsert(trx: TransactionQuery | typeof query, data: any): Promise<void> {
    await SaleQueries.rawInsert(trx, data);
  }

  static async insertDetail(trx: TransactionQuery | typeof query, data: any): Promise<void> {
    await SaleQueries.insertDetail(trx, data);
  }

  static async insertUserRelation(
    trx: TransactionQuery,
    ventaId: string,
    usuarioId: string
  ): Promise<void> {
    await SaleQueries.insertUserRelation(trx, ventaId, usuarioId);
  }

  static async getById(id: string): Promise<any | null> {
    return await SaleQueries.getById(id);
  }

  static async updateStatus(id: string, estado: number, userId?: string): Promise<SaleType | null> {
    return await SaleQueries.updateStatus(id, estado, userId);
  }

  static async requestAnulacion(
    id: string,
    reason: string,
    requestedBy: string,
    amount: number
  ): Promise<string> {
    return await SaleQueries.requestAnulacion(id, reason, requestedBy, amount);
  }

  static async processAnulacion(
    requestId: string,
    approvedBy: string,
    status: string
  ): Promise<SaleType | null> {
    return await SaleQueries.processAnulacion(requestId, approvedBy, status);
  }

  static async delete(id: string): Promise<void> {
    await SaleQueries.delete(id);
  }
}
