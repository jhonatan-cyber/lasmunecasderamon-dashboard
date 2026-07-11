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

  static async update(id: string | number, body: Record<string, unknown>) {
    return await RoomRepository.update(id.toString(), body);
  }

  static async getAll(status?: string) {
    return await RoomRepository.getAll(status);
  }

  static async updateStatus(id: string | number, action: string) {
    return await RoomRepository.updateStatus(id.toString(), action);
  }

  static async delete(id: string | number) {
    return await RoomRepository.delete(id.toString());
  }

  static async reorder(room_orders: Array<{ id: string; orden: number }>) {
    return await RoomRepository.reorder(
      room_orders.map(r => ({ id: r.id, display_order: r.orden }))
    );
  }
}
