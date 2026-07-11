import { PayrollRepository } from '@/lib/repositories/PayrollRepository';

export class PayrollService {
  static async getSummary() {
    return await PayrollRepository.getSummary();
  }

  static async pay(userId: string, entregadoPor?: string) {
    return await PayrollRepository.pay(userId, entregadoPor);
  }
}
