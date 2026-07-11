import { GratificacionRepository } from '@/lib/repositories/GratificacionRepository';
import type { GratificacionAction } from '@/lib/repositories/gratificacion/GratificacionQueries';

export class GratificacionService {
  static async request(usuario_id: string, monto: number, descripcion?: string, device_date?: string) {
    if (!usuario_id) throw new Error('Usuario es requerido');
    if (!monto || monto <= 0) throw new Error('Monto debe ser positivo');
    return await GratificacionRepository.create({ usuario_id, monto, descripcion });
  }

  static async getAll(userId?: string) {
    return await GratificacionRepository.getAll(userId);
  }

  static async create(data: { usuario_id: string; monto: number; descripcion?: string }) {
    if (!data.usuario_id) throw new Error('Usuario es requerido');
    if (!data.monto || data.monto <= 0) throw new Error('Monto debe ser positivo');
    return await GratificacionRepository.create(data);
  }

  static async getSolicitudDetalle(id: string) {
    return await GratificacionRepository.getSolicitudDetalle(id);
  }

  static async processSolicitud(id: string, action: GratificacionAction, adminId?: string) {
    return await GratificacionRepository.processSolicitud(id, action, adminId);
  }

  static async update(id: string, data: { monto: number; descripcion?: string }) {
    return await GratificacionRepository.update(id, data);
  }

  static async delete(id: string) {
    return await GratificacionRepository.delete(id);
  }
}
