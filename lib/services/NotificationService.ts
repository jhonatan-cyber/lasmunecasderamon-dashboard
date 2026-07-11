import { NotificationRepository } from '@/lib/repositories/NotificationRepository';

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
}
