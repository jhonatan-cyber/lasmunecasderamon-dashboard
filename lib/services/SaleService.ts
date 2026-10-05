import { query, type TransactionQuery } from '@/lib/database/db';
import { SaleRepository } from '@/lib/repositories/SaleRepository';
import { SecurityAlertService } from '@/lib/services/SecurityAlertService';
import {
  registrarVenta,
  actualizarEstadoVenta,
  aprobarAnulacionVenta,
  solicitarAnulacionVenta,
  procesarAnulacionVenta
} from '@/modules/ventas';
import type { EntradaRegistroVenta } from '@/modules/ventas/contracts';
import { enUnaUnidad, type ContextoOperacion } from '@/lib/transaccion/contrato';
import { conContextoOperacionExistente } from '@/lib/transaccion/compatibilidad';
import { ejecutarEfectosConfirmados } from '@/lib/transaccion/efectos';
export interface CreateSaleOptions {
  trx?: TransactionQuery;
  onAfterCommit?: (task: () => void | Promise<void>) => void;
}
export class SaleService {
  static async createSale(
    body: EntradaRegistroVenta,
    createdBy: string,
    options: CreateSaleOptions = {}
  ) {
    const tareas: Array<() => void | Promise<void>> = [];
    const aplazar =
      options.onAfterCommit ?? ((tarea: () => void | Promise<void>) => tareas.push(tarea));
    if (options.trx && !options.onAfterCommit)
      throw new Error('Una transacci?n ajena requiere onAfterCommit');
    const ejecutar = (contexto: ContextoOperacion) =>
      registrarVenta(body, createdBy, contexto, aplazar);
    const resultado = options.trx
      ? await conContextoOperacionExistente(options.trx, ejecutar)
      : await enUnaUnidad(unidad => unidad.ejecutar(ejecutar));
    await ejecutarEfectosConfirmados(tareas);
    return resultado;
  }

  static async approveAnulacion(ventaId: string, approvedBy: string, requestedAmount: number) {
    await aprobarAnulacionVenta(ventaId, approvedBy, requestedAmount);
    return await SaleRepository.getById(ventaId);
  }

  static async getAll(params: Record<string, string | undefined>) {
    return await SaleRepository.getAll(params as any);
  }

  static async getById(id: string | number) {
    return await SaleRepository.getById(id.toString());
  }

  static async updateStatus(id: string, estado: number, userId?: string) {
    await actualizarEstadoVenta(id, estado, userId);
    return await SaleRepository.getById(id);
  }

  static async processAnulacion(requestId: string, approvedBy: string, status: string) {
    const ventaId = await procesarAnulacionVenta(requestId, approvedBy, status);
    // 🔒 Verificar anulaciones masivas
    try {
      const saleInfo = await query<any[]>(
        `SELECT v.codigo, v.total FROM ventas v
         INNER JOIN solicitudes_anulacion_ventas sav ON sav.venta_id = v.id_venta
         WHERE sav.id = ? LIMIT 1`,
        [requestId]
      );
      if (saleInfo.length > 0) {
        SecurityAlertService.checkMassAnulation({
          entityType: 'venta',
          entityId: requestId,
          entityCode: saleInfo[0].codigo,
          userId: approvedBy,
          totalAmount: Number(saleInfo[0].total || 0)
        }).catch(() => {});
      }
    } catch {}
    if (!ventaId) return null;
    return await SaleRepository.getById(ventaId);
  }

  static async requestAnulacion(id: string, motivo: string, userId: string, monto: number) {
    return await solicitarAnulacionVenta(id, motivo, userId, monto);
  }
}
