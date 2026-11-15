import { GratificacionRepository } from '@/modules/personal/gratificaciones/repositorio';
import type { GratificacionAction } from '@/modules/personal/gratificaciones/consultas';
import { GratificacionCreateSchema, GratificacionUpdateSchema } from '@/lib/business/schemas';

export class GratificacionService {
  /** Solicitud pendiente; no confundir con create(), que crea un monto por pagar. */
  static async solicitarParaUsuario(
    usuarioId: string,
    monto: number,
    motivo: string,
    adminId: string
  ) {
    // Validación de doble capa con Zod.
    GratificacionCreateSchema.parse({ usuario_id: usuarioId, monto, descripcion: motivo });
    return GratificacionRepository.request(usuarioId, monto, motivo, adminId, false);
  }
  static async request(
    usuario_id: string,
    monto: number,
    descripcion?: string,
    /** Quién solicita (id de sesión). Se persiste como `solicitante_id` (037). */
    solicitanteId?: string
  ) {
    // Validación de doble capa: la route ya validó con Zod, el servicio revalida.
    GratificacionCreateSchema.parse({ usuario_id, monto, descripcion });
    return await GratificacionRepository.create({
      usuario_id,
      monto,
      descripcion,
      solicitante_id: solicitanteId || null
    });
  }

  /**
   * `userId` limita por beneficiario; `solicitanteId` agrega la unión de lo que
   * esa persona solicitó (la combinación es el filtro del cajero en el GET).
   */
  static async getAll(userId?: string, solicitanteId?: string) {
    return await GratificacionRepository.getAll(userId, solicitanteId);
  }

  static async create(data: {
    usuario_id: string;
    monto: number;
    descripcion?: string;
    solicitante_id?: string | null;
  }) {
    // Validación de doble capa: la route ya validó con Zod, el servicio revalida.
    GratificacionCreateSchema.parse({ usuario_id: data.usuario_id, monto: data.monto, descripcion: data.descripcion });
    return await GratificacionRepository.create(data);
  }

  static async getSolicitudDetalle(id: string) {
    return await GratificacionRepository.getSolicitudDetalle(id);
  }

  static async processSolicitud(
    id: string,
    action: GratificacionAction,
    adminId?: string,
    montoEsperado?: number
  ) {
    return await GratificacionRepository.processSolicitud(id, action, adminId, montoEsperado);
  }

  static async update(id: string, data: { monto: number; descripcion?: string }) {
    // Validación de doble capa con Zod.
    GratificacionUpdateSchema.parse(data);
    return await GratificacionRepository.update(id, data);
  }

  static async delete(id: string) {
    return await GratificacionRepository.delete(id);
  }
}
