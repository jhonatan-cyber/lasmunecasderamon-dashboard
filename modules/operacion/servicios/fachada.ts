import { ServiceCreateSchema } from '@/lib/business/schemas';
import { SecurityAlertService } from '@/modules/auditoria';
import {
  actualizarEstadoServicio,
  solicitarAnulacionServicio,
  procesarAnulacionServicio
} from '@/modules/operacion/servicios/anulaciones';
import {
  crearServicio as crearServicioOperacion,
  actualizarServicioCasoUso
} from '@/modules/operacion/servicios/creacion';
import {
  listarServicios,
  listarServiciosDeUsuario,
  listarServiciosPorFechas,
  obtenerServicioDetallado,
  obtenerServicioParaAlerta
} from '@/modules/operacion/servicios/servicio';
import { z } from 'zod';

type ServiceCreateInput = z.input<typeof ServiceCreateSchema>;

export class ServiceService {
  static async createService(body: ServiceCreateInput, createdBy: string) {
    return await crearServicioOperacion(body, createdBy);
  }

  static async getAll(params: Record<string, string | undefined>) {
    return await listarServicios(params as any);
  }

  static async getById(id: string | number) {
    return await obtenerServicioDetallado(id.toString());
  }

  static async getByUser(userId: string) {
    return await listarServiciosDeUsuario(userId);
  }

  static async getByDates(startDate: string, endDate: string) {
    return await listarServiciosPorFechas(startDate, endDate);
  }

  static async updateService(id: string | number, body: Record<string, unknown>) {
    await actualizarServicioCasoUso(id.toString(), body);
    return await obtenerServicioDetallado(id.toString());
  }

  static async updateStatus(id: string | number, estado: number, userId?: string) {
    await actualizarEstadoServicio(id.toString(), estado, userId);
    return await obtenerServicioDetallado(id.toString());
  }

  static async processAnulacion(requestId: string, approvedBy: string, status: string) {
    await procesarAnulacionServicio(requestId, approvedBy, status);
    // 🔒 Verificar anulaciones masivas
    try {
      const serviceInfo = await obtenerServicioParaAlerta(requestId);
      if (serviceInfo.length > 0) {
        SecurityAlertService.checkMassAnulation({
          entityType: 'servicio',
          entityId: requestId,
          entityCode: serviceInfo[0].codigo,
          userId: approvedBy,
          totalAmount: Number(serviceInfo[0].total || 0)
        }).catch(() => {});
      }
    } catch {}
    return;
  }

  static async requestAnulacion(id: string, motivo: string, userId: string) {
    return await solicitarAnulacionServicio(id, motivo, userId);
  }
}
