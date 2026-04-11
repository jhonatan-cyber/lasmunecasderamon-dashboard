import { RoomSchema } from '@/lib/business/schemas';
import { RoomRepository } from '@/lib/repositories/RoomRepository';
import { z } from 'zod';

type RoomInput = z.input<typeof RoomSchema>;

export class RoomService {
  static async createRoom(body: RoomInput) {
    const validated = RoomSchema.omit({ id: true }).parse(body);
    return await RoomRepository.create(validated);
  }

  static async updateRoom(id: string, body: Partial<RoomInput>) {
    const validated = RoomSchema.partial().omit({ id: true }).parse(body);
    return await RoomRepository.update(id, validated);
  }
}
