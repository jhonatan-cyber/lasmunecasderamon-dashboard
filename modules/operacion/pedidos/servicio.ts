import { OrderCreateSchema } from '@/lib/business/schemas';
import { OrderRepository } from '@/modules/operacion/pedidos/repositorio';
import { aplicarCobroAPedido } from './reglas';
import { z } from 'zod';

type OrderCreateInput = z.input<typeof OrderCreateSchema>;

export class OrderService {
  static async getAll(limit: number = 200) {
    return await OrderRepository.getAll(limit);
  }

  static async getPending(limit: number = 5) {
    return await OrderRepository.getPending(limit);
  }

  static async getByUser(userId: string) {
    return await OrderRepository.getByUser(userId);
  }

  static async create(body: OrderCreateInput) {
    const validated = OrderCreateSchema.parse(body);
    const result = await OrderRepository.create(validated);
    return result;
  }

  static async delete(id: string) {
    return await OrderRepository.delete(id);
  }

  static async getDetail(id: string) {
    return await OrderRepository.getDetail(id);
  }

  static async updateStatus(id: string, estado: number) {
    return await OrderRepository.updateStatus(id, estado);
  }
}

export { aplicarCobroAPedido } from './reglas';

/**
 * Prepara la venta del pedido: lo vendido sale del pedido y el pago del cobro
 * que manda la caja. Sin cobro se usa el método guardado en el pedido.
 */
export async function prepararVentaPedido(
  id: string,
  tiempo: number,
  contexto: import('@/lib/transaction/contract').ContextoOperacion,
  cobro: Record<string, any> = {}
) {
  const venta = await OrderRepository.paraVenta(id, tiempo, contexto);
  return aplicarCobroAPedido(venta, cobro);
}
