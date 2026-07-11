import { OrderCreateSchema } from '@/lib/business/schemas';
import { OrderRepository } from '@/lib/repositories/OrderRepository';
import { z } from 'zod';

type OrderCreateInput = z.input<typeof OrderCreateSchema>;

export class OrderService {
  static async getAll(limit: number = 200) {
    return await OrderRepository.getAll(limit);
  }

  static async getByUser(userId: string) {
    return await OrderRepository.getByUser(userId);
  }

  static async create(body: OrderCreateInput) {
    const validated = OrderCreateSchema.parse(body);
    return await OrderRepository.create(validated);
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
