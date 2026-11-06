import 'server-only';
import { SecurityAlertService } from '@/modules/auditoria';
import { registrarVenta } from '@/workflows/registrar-venta';
import {
  actualizarEstadoVenta,
  aprobarAnulacionVenta,
  solicitarAnulacionVenta,
  procesarAnulacionVenta
} from '@/workflows/anulaciones-venta';
import {
  listarVentas,
  obtenerVenta,
  obtenerVentaParaAlerta,
  obtenerBaucherFotoVenta
} from '@/modules/ventas';
import type { EntradaRegistroVenta } from '@/modules/ventas/contracts';
import { enUnaUnidad, type ContextoOperacion } from '@/lib/transaction/contract';
import { ejecutarEfectosConfirmados } from '@/lib/transaction/effects';
import { eliminarFotoBaucher, guardarFotoBaucher } from '@/lib/utils/image-utils';
export interface CreateSaleOptions {
  contexto?: ContextoOperacion;
  onAfterCommit?: (task: () => void | Promise<void>) => void;
  entradaId?: string;
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
    if (options.contexto && !options.onAfterCommit)
      throw new Error('Una transacción ajena requiere onAfterCommit');
    const baucherFilename = body.baucher_foto
      ? await guardarFotoBaucher(body.baucher_foto, 'sale', { codigo: body.codigo })
      : null;
    let ventaCreada = false;
    try {
      const ejecutar = (contexto: ContextoOperacion) =>
        registrarVenta(body, createdBy, contexto, aplazar, {
          entradaId: options.entradaId,
          baucherFilename
        });
      const resultado = options.contexto
        ? await ejecutar(options.contexto)
        : await enUnaUnidad(unidad => unidad.ejecutar(ejecutar));
      ventaCreada = true;
      await ejecutarEfectosConfirmados(tareas);
      return resultado;
    } catch (error) {
      if (baucherFilename && !ventaCreada)
        await eliminarFotoBaucher(baucherFilename, 'sale', { codigo: body.codigo });
      throw error;
    }
  }

  static async approveAnulacion(ventaId: string, approvedBy: string, requestedAmount: number) {
    await aprobarAnulacionVenta(ventaId, approvedBy, requestedAmount);
    return await obtenerVenta(ventaId);
  }

  static async getAll(params: Record<string, string | undefined>) {
    return await listarVentas(params as any);
  }

  static async getById(id: string | number) {
    return await obtenerVenta(id.toString());
  }

  static async getBaucherFoto(id: string | number) {
    return await obtenerBaucherFotoVenta(id.toString());
  }

  static async updateStatus(id: string, estado: number, userId?: string) {
    await actualizarEstadoVenta(id, estado, userId);
    return await obtenerVenta(id);
  }

  static async processAnulacion(requestId: string, approvedBy: string, status: string) {
    const ventaId = await procesarAnulacionVenta(requestId, approvedBy, status);
    try {
      const saleInfo = await obtenerVentaParaAlerta(requestId);
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
    return await obtenerVenta(ventaId);
  }

  static async requestAnulacion(id: string, motivo: string, userId: string, monto: number) {
    return await solicitarAnulacionVenta(id, motivo, userId, monto);
  }

  static async delete(id: string) {
    const { eliminarVenta } = await import('./anulaciones-venta');
    await eliminarVenta(id);
  }
}
