import { GratificacionRepository } from '@/modules/personal/gratificaciones/repositorio';
import type { GratificacionAction } from '@/modules/personal/gratificaciones/consultas';

export class GratificacionService {
  /** Solicitud pendiente; no confundir con create(), que crea un monto por pagar. */
  static async solicitarParaUsuario(
    usuarioId: string,
    monto: number,
    motivo: string,
    adminId: string
  ) {
    if (!usuarioId || !Number.isFinite(monto) || monto <= 0)
      throw new Error('Usuario y monto positivo requeridos');
    return GratificacionRepository.request(usuarioId, monto, motivo, adminId, false);
  }
  static async request(
    usuario_id: string,
    monto: number,
    descripcion?: string,
    /** Quién solicita (id de sesión). Se persiste como `solicitante_id` (037). */
    solicitanteId?: string
  ) {
    if (!usuario_id) throw new Error('Usuario es requerido');
    if (!Number.isFinite(monto) || monto <= 0) throw new Error('Monto debe ser positivo');
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
    if (!data.usuario_id) throw new Error('Usuario es requerido');
    if (!Number.isFinite(data.monto) || data.monto <= 0) throw new Error('Monto debe ser positivo');
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
    if (!Number.isFinite(data.monto) || data.monto <= 0) throw new Error('Monto debe ser positivo');
    return await GratificacionRepository.update(id, data);
  }

  static async delete(id: string) {
    return await GratificacionRepository.delete(id);
  }
}
