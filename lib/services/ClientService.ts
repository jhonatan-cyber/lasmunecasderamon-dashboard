import { ClientSchema } from '@/lib/business/schemas';
import { ClientRepository } from '@/lib/repositories/ClientRepository';

export class ClientService {

  static async createClient(body: any) {
    const validated = ClientSchema.omit({ id: true }).parse(body);
    return await ClientRepository.create(validated);
  }

  static async updateClient(id: string, body: any) {
    const validated = ClientSchema.partial().omit({ id: true }).parse(body);
    return await ClientRepository.update(id, validated);
  }

  static async getHistory(clientId: string) {
    return await ClientRepository.getHistory(clientId);
  }

  static async addPrepago(data: { cliente_id: string; monto: number; tipo: 'CARGA'; metodo_pago?: string; usuario_id?: string; metadatos?: any }) {
    return await ClientRepository.addPrepago(data);
  }
}
