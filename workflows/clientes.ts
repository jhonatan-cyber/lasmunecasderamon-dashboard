import 'server-only';
import { cargarPrepago, devolverSaldo as devolverSaldoPrepago } from '@/workflows/prepago';
import { ClientSchema, type ClientType } from '@/lib/business/schemas';
import {
  listarClientes,
  obtenerCliente,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
  obtenerHistorial
} from '@/modules/clientes';
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
    return await crearCliente(validated);
  }

  static async updateClient(id: string, body: Partial<ClientCreateInput>) {
    const validated = ClientSchema.partial().omit({ id: true }).parse(body);
    return await actualizarCliente(id, validated);
  }

  static async getHistory(clientId: string) {
    return await obtenerHistorial(clientId);
  }

  static async update(id: string | number, body: Record<string, unknown>) {
    const validated = ClientSchema.partial().omit({ id: true }).parse(body);
    return await actualizarCliente(id.toString(), validated);
  }

  static async addPrepago(data: PrepagoInput) {
    return await cargarPrepago(data);
  }

  static async devolverSaldo(data: DevolucionInput) {
    return await devolverSaldoPrepago(data);
  }

  static async getById(id: string | number) {
    return await obtenerCliente(id.toString());
  }

  static async getAll(params?: Record<string, unknown>) {
    return await listarClientes({
      search: params?.search as string | undefined,
      limit: params?.limit as number | undefined,
      offset: params?.offset as number | undefined,
      conSaldo: params?.conSaldo as boolean | undefined
    });
  }

  static async delete(id: string | number) {
    return await eliminarCliente(id.toString());
  }
}
