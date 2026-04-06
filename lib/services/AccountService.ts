import { CuentaCreateSchema } from '@/lib/business/schemas';
import { CuentaRepository } from '@/lib/repositories/CuentaRepository';

export class AccountService {
  static async createAccountMovement(body: any, createdBy: string) {
    const validated = CuentaCreateSchema.parse(body);
    return await CuentaRepository.create(validated, createdBy);
  }
}
