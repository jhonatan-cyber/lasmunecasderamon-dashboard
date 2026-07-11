import {
  getAllGratificaciones,
  createGratificacion,
  requestGratificacion,
  getGratificacionSolicitudDetalle,
  processGratificacionSolicitud,
  updateGratificacion,
  deleteGratificacion
} from './gratificacion/GratificacionQueries';
import type { GratificacionAction } from './gratificacion/GratificacionQueries';

export class GratificacionRepository {
  static async getAll(userId?: string) {
    return getAllGratificaciones(userId);
  }

  static async create(data: { usuario_id: string; monto: number; descripcion?: string }) {
    return createGratificacion(data);
  }

  static async request(
    targetUserId: string,
    monto: number,
    descripcion: string | undefined,
    requestedByUserId: string
  ) {
    return requestGratificacion(targetUserId, monto, descripcion, requestedByUserId);
  }

  static async getSolicitudDetalle(id: string) {
    return getGratificacionSolicitudDetalle(id);
  }

  static async processSolicitud(id: string, action: GratificacionAction, adminId?: string) {
    return processGratificacionSolicitud(id, action, adminId);
  }

  static async update(id: string, data: { monto: number; descripcion?: string }) {
    return updateGratificacion(id, data);
  }

  static async delete(id: string) {
    return deleteGratificacion(id);
  }
}
