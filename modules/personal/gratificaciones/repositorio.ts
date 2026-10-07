import {
  getAllGratificaciones,
  createGratificacion,
  requestGratificacion,
  getGratificacionSolicitudDetalle,
  processGratificacionSolicitud,
  updateGratificacion,
  deleteGratificacion
} from '@/modules/personal/gratificaciones/consultas';
import type { GratificacionAction } from '@/modules/personal/gratificaciones/consultas';

export class GratificacionRepository {
  static async getAll(userId?: string, solicitanteId?: string) {
    return getAllGratificaciones(userId, solicitanteId);
  }

  static async create(data: {
    usuario_id: string;
    monto: number;
    descripcion?: string;
    solicitante_id?: string | null;
  }) {
    return createGratificacion(data);
  }

  static async request(
    targetUserId: string,
    monto: number,
    descripcion: string | undefined,
    requestedByUserId: string,
    vincularAnticipo = true
  ) {
    return requestGratificacion(targetUserId, monto, descripcion, requestedByUserId, vincularAnticipo);
  }

  static async getSolicitudDetalle(id: string) {
    return getGratificacionSolicitudDetalle(id);
  }

  static async processSolicitud(id: string, action: GratificacionAction, adminId?: string, montoEsperado?: number) {
    return processGratificacionSolicitud(id, action, adminId, montoEsperado);
  }

  static async update(id: string, data: { monto: number; descripcion?: string }) {
    return updateGratificacion(id, data);
  }

  static async delete(id: string) {
    return deleteGratificacion(id);
  }
}
