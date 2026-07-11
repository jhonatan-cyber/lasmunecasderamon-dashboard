import { AnticipoRequestSchema } from '@/lib/business/schemas';
import { AnticipoRepository } from '@/lib/repositories/AnticipoRepository';
import { ValidationError } from '@/lib/errors/errors';
import { z } from 'zod';

type AnticipoRequestInput = z.input<typeof AnticipoRequestSchema>;

type AnticipoItem = {
  id: string;
  empleado_nombre: string;
};

export class AnticipoService {
  static async requestAnticipo(usuario_id: string, body: AnticipoRequestInput) {
    const validated = AnticipoRequestSchema.parse(body);
    return await AnticipoRepository.request(
      usuario_id,
      validated.monto,
      validated.motivo,
      validated.device_date
    );
  }

  static async grantAnticipo(
    usuario_id: string,
    monto: number,
    motivo?: string,
    device_date?: string,
    adminId?: string | number
  ) {
    if (monto <= 0) throw new ValidationError('El monto debe ser positivo', { monto });
    return await AnticipoRepository.grant(usuario_id, monto, motivo, device_date, adminId);
  }

  static async getAll(params?: Record<string, unknown>) {
    return await AnticipoRepository.getAll(params);
  }

  static async getByDates(userId: string, dates: string[]) {
    return await AnticipoRepository.getByDates(userId, dates);
  }

  static async getByUser(userId: string, startDate?: string, endDate?: string) {
    return await AnticipoRepository.getByUser(userId, startDate, endDate);
  }

  static async processSolicitud(id: string, action: 'approve' | 'reject', adminId?: string) {
    return await AnticipoRepository.processSolicitud(id, action, adminId);
  }

  static async processSolicitudFromString(id: string, action: string, adminId?: string) {
    return await AnticipoRepository.processSolicitud(id, action as 'approve' | 'reject', adminId);
  }

  static async deliverAnticipo(id: string, userId: string) {
    return await AnticipoRepository.deliverAnticipo(id, userId);
  }

  static async updateStatus(id: string, estado: number, userId: string) {
    return await AnticipoRepository.updateStatus(id, estado, userId);
  }

  static async request(usuario_id: string, monto: number, motivo: string) {
    return await AnticipoRepository.request(usuario_id, monto, motivo);
  }

  static async processAnticipoFromCommand(
    anticiposPendientes: AnticipoItem[],
    anticipoId: string,
    shouldApprove: boolean,
    adminWhatsApp: string
  ) {
    const anticipo = anticiposPendientes.find(a => a.id === anticipoId);

    if (!anticipo) {
      return { ok: false, message: 'Solicitud no encontrada en los pendientes actuales.' };
    }

    try {
      await AnticipoRepository.processSolicitud(anticipoId, shouldApprove ? 'approve' : 'reject');
      return {
        ok: true,
        message: `Anticipo de ${anticipo.empleado_nombre} ${shouldApprove ? 'APROBADO' : 'RECHAZADO'} correctamente.`
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      return { ok: false, message: `Error al procesar: ${msg}` };
    }
  }
}
