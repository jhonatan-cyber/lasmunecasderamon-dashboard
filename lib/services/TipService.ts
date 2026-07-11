import { TipRegisterSchema } from '@/lib/business/schemas';
import { TipRepository } from '@/lib/repositories/TipRepository';
import { z } from 'zod';

type TipRegisterInput = z.input<typeof TipRegisterSchema>;

export class TipService {
  static async register(body: TipRegisterInput) {
    const validated = TipRegisterSchema.parse(body);
    return await TipRepository.register(validated);
  }

  static async getSummary(isAdmin: boolean, userId: string, cajaActiva: boolean) {
    return await TipRepository.getSummary(isAdmin, userId, cajaActiva);
  }

  static async getByUser(userId: string) {
    return await TipRepository.getByUser(userId);
  }

  static async getDetails(usuario_id: string, startDate?: string, endDate?: string) {
    return await TipRepository.getDetails(usuario_id, startDate, endDate);
  }

  static async getByIdWithParticipants(id: string) {
    return await TipRepository.getByIdWithParticipants(id);
  }
}
