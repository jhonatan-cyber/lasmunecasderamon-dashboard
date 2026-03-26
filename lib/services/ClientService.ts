import { ClientSchema } from '@/lib/business/schemas';
import { ClientRepository } from '@/lib/repositories/ClientRepository';

export class ClientService {
  /**
   * Procesa la creación de un nuevo cliente.
   */
  static async createClient(body: any) {
    // Validar el body con el esquema correspondiente
    const validated = ClientSchema.omit({ id: true }).parse(body);
    
    // Delegar al repositorio para la persistencia
    return await ClientRepository.create(validated);
  }

  /**
   * Actualiza un cliente existente.
   */
  static async updateClient(id: string, body: any) {
    const validated = ClientSchema.partial().omit({ id: true }).parse(body);
    return await ClientRepository.update(id, validated);
  }
}
