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

type DevolucionInput = {
  cliente_id: string;
  monto: number;
  metodo_pago: string;
  motivo?: string;
  usuario_id?: string;
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

  static async update(id: string | number, body: Record<string, unknown>) {
    return await ClientRepository.update(id.toString(), body);
  }

  static async addPrepago(data: PrepagoInput) {
    return await ClientRepository.addPrepago(data);
  }

  static async devolverSaldo(data: DevolucionInput) {
    return await ClientRepository.devolverSaldo(data);
  }

  static async getById(id: string | number) {
    return await ClientRepository.getById(id.toString());
  }

  static async getAll(params?: Record<string, unknown>) {
    return await ClientRepository.getAll(params);
  }

  static async delete(id: string | number) {
    return await ClientRepository.delete(id.toString());
  }
}
