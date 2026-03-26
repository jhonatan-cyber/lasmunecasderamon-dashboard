import { RoomSchema } from '@/lib/business/schemas';
import { RoomRepository } from '@/lib/repositories/RoomRepository';

export class RoomService {
  /**
   * Procesa la creación de una nueva habitación.
   */
  static async createRoom(body: any) {
    // Validar el body con el esquema correspondiente
    const validated = RoomSchema.omit({ id: true }).parse(body);
    
    // Delegar al repositorio para la persistencia
    return await RoomRepository.create(validated);
  }

  /**
   * Actualiza una habitación existente.
   */
  static async updateRoom(id: string, body: any) {
    const validated = RoomSchema.partial().omit({ id: true }).parse(body);
    return await RoomRepository.update(id, validated);
  }
}
