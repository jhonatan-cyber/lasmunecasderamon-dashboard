import { ClientSchema, type ClientType } from '@/lib/business/schemas';
import { ClientRepository } from '@/lib/repositories/ClientRepository';
import { z } from 'zod';

type ClientCreateInput = z.input<typeof ClientSchema>;

type PrepagoInput = {
  cliente_id: string;
  monto: number;
  tipo: 'CARGA';
  metodo_pago?: string;
  pagos_mixtos?: Array<{ metodo: string; monto: number }>;
  usuario_id?: string;
  metadatos?: Record<string, unknown>;
};

export class ClientService {
  static async createClient(body: ClientCreateInput) {
    const validated = ClientSchema.omit({ id: true }).parse(body);
    return await ClientRepository.create(validated);
  }

  static async updateClient(id: string, body: Partial<ClientCreateInput>) {
    const validated = ClientSchema.partial().omit({ id: true }).parse(body);
    return await ClientRepository.update(id, validated);
  }

  static async getHistory(clientId: string) {
    return await ClientRepository.getHistory(clientId);
  }

  static async addPrepago(data: PrepagoInput) {
    return await ClientRepository.addPrepago(data);
  }
}
