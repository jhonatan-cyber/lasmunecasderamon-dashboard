import { query } from '@/lib/database/db';
import { ServiceCreateSchema } from '@/lib/business/schemas';
import { ServiceRepository } from '@/lib/repositories/ServiceRepository';
import { SecurityAlertService } from '@/lib/services/SecurityAlertService';
import {
  actualizarEstadoServicio,
  solicitarAnulacionServicio,
  procesarAnulacionServicio,
  crearServicio as crearServicioOperacion,
  actualizarServicioCasoUso
} from '@/modules/operacion';
import { z } from 'zod';

type ServiceCreateInput = z.input<typeof ServiceCreateSchema>;

export class ServiceService {
  private static async getLoggedInHostessIds(
    trx: typeof query,
    userIds: string[]
  ): Promise<string[]> {
    if (!userIds.length) return [];

    const rows = await trx<any[]>(
      `SELECT DISTINCT u.id_usuario
       FROM usuarios u
       INNER JOIN roles r ON r.id_rol = u.rol_id
       INNER JOIN logins l ON l.usuario_id = u.id_usuario
       WHERE u.id_usuario IN (${userIds.map(() => '?').join(', ')})
         AND u.estado = 1
         AND l.estado = 1
         AND l.en_local = 1
         AND LOWER(r.nombre) = 'anfitriona'`,
      userIds
    );

    return rows.map((row: any) => row.id_usuario);
  }

  static async createService(body: ServiceCreateInput, createdBy: string) {
    return await crearServicioOperacion(body, createdBy);
  }

  static async getAll(params: Record<string, string | undefined>) {
    return await ServiceRepository.getAll(params as any);
  }

  static async getById(id: string | number) {
    return await ServiceRepository.getById(id.toString());
  }

  static async getByUser(userId: string) {
    return await ServiceRepository.getByUser(userId);
  }

  static async getByDates(startDate: string, endDate: string) {
    return await ServiceRepository.getByDates(startDate, endDate);
  }

  static async updateService(id: string | number, body: Record<string, unknown>) {
    await actualizarServicioCasoUso(id.toString(), body);
    return await ServiceRepository.getById(id.toString());
  }

  static async updateStatus(id: string | number, estado: number, userId?: string) {
    await actualizarEstadoServicio(id.toString(), estado, userId);
    return await ServiceRepository.getById(id.toString());
  }

  static async processAnulacion(requestId: string, approvedBy: string, status: string) {
    await procesarAnulacionServicio(requestId, approvedBy, status);
    // 🔒 Verificar anulaciones masivas
    try {
      const serviceInfo = await query<any[]>(
        `SELECT s.codigo, s.total FROM servicios s
         INNER JOIN solicitudes_anulacion_servicios sas ON sas.servicio_id = s.id_servicio
         WHERE sas.id = ? LIMIT 1`,
        [requestId]
      );
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
