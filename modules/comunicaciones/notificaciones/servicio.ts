import { NotificationRepository } from '@/modules/comunicaciones/notificaciones/repositorio';
import type { TransactionQuery } from '@/lib/database/db';

export class NotificationService {
  static async create(data: {
    usuario_id: string;
    tipo: string;
    titulo: string;
    mensaje: string;
    estado: number;
    data?: string;
  }) {
    return await NotificationRepository.create(data);
  }

  static async crearParaRol(
    data: {
      rol: string;
      tipo: string;
      titulo: string;
      mensaje: string;
      data?: string;
    },
    trx?: TransactionQuery
  ) {
    return await NotificationRepository.createForRole(data, trx);
  }

  static async getHistory(userId: string) {
    return await NotificationRepository.getHistory(userId);
  }

  static async getPending(userId: string) {
    return await NotificationRepository.getPending(userId);
  }

  static async getPendingCount(userId: string) {
    return await NotificationRepository.getPendingCount(userId);
  }

  static async markAsRead(id: string) {
    return await NotificationRepository.markAsRead(id);
  }

  static async registerToken(userId: string, token: string, deviceType?: string) {
    return await NotificationRepository.registerToken(userId, token, deviceType);
  }

  static async markAsReadForUser(userId: string, id?: string) {
    return await NotificationRepository.markAsReadForUser(userId, id);
  }
}
