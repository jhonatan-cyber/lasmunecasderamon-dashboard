import { RoomSchema } from '@/lib/business/schemas';
import { RoomRepository } from '@/lib/repositories/RoomRepository';

export class RoomService {
  static async createRoom(body: any) {
    const validated = RoomSchema.omit({ id: true }).parse(body);
    return await RoomRepository.create(validated);
  }

  static async updateRoom(id: string, body: any) {
    const validated = RoomSchema.partial().omit({ id: true }).parse(body);
    return await RoomRepository.update(id, validated);
  }
}
