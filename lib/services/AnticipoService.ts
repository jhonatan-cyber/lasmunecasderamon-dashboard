import { AnticipoRequestSchema } from '@/lib/business/schemas';
import { AnticipoRepository } from '@/lib/repositories/AnticipoRepository';

export class AnticipoService {

  static async requestAnticipo(usuario_id: string, body: any) {
    const validated = AnticipoRequestSchema.parse(body);
    return await AnticipoRepository.request(usuario_id, validated.monto, validated.motivo, validated.device_date);
  }


  static async grantAnticipo(usuario_id: string, monto: number, motivo?: string, device_date?: string) {
    if (monto <= 0) throw new Error('El monto debe ser positivo');
    return await AnticipoRepository.grant(usuario_id, monto, motivo, device_date);
  }

  static async processAnticipoFromCommand(
    anticiposPendientes: any[],
    anticipoId: string,
    shouldApprove: boolean,
    adminWhatsApp: string
  ) {
    const anticipo = anticiposPendientes.find((a) => a.id === anticipoId);

    if (!anticipo) {
      return { ok: false, message: 'Solicitud no encontrada en los pendientes actuales.' };
    }

    try {
      await AnticipoRepository.processSolicitud(anticipoId, shouldApprove ? 'approve' : 'reject');
      return { ok: true, message: `Anticipo de ${anticipo.empleado_nombre} ${shouldApprove ? 'APROBADO' : 'RECHAZADO'} correctamente.` };
    } catch (error: any) {
      return { ok: false, message: `Error al procesar: ${error.message}` };
    }
  }
}
