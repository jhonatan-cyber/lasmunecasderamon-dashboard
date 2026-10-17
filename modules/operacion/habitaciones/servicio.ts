import { RoomWriteSchema } from '@/lib/business/schemas';
import { RoomRepository } from '@/modules/operacion/habitaciones/repositorio';
import { z } from 'zod';

type RoomInput = z.input<typeof RoomWriteSchema>;

export class RoomService {
  static async createRoom(body: RoomInput) {
    const validated = RoomWriteSchema.parse(body);
    return await RoomRepository.create(validated);
  }

  static async updateRoom(id: string, body: Partial<RoomInput>) {
    const validated = RoomWriteSchema.partial().parse(body);
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

  static async reorder(room_orders: Array<{ id: string; display_order: number }>) {
    const items = z
      .array(z.object({ id: z.string().min(1), display_order: z.number().int().positive() }))
      .min(1)
      .parse(room_orders);
    if (
      new Set(items.map(item => item.id)).size !== items.length ||
      new Set(items.map(item => item.display_order)).size !== items.length
    ) {
      throw new Error('El orden de habitaciones contiene posiciones o habitaciones repetidas');
    }
    return await RoomRepository.reorder(items);
  }
}
