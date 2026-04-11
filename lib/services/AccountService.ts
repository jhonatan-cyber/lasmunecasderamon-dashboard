import { CuentaCreateSchema } from '@/lib/business/schemas';
import { CuentaRepository } from '@/lib/repositories/CuentaRepository';
import { z } from 'zod';

type AccountCreateInput = z.input<typeof CuentaCreateSchema>;

export class AccountService {
  static async createAccountMovement(body: AccountCreateInput, createdBy: string) {
    const validated = CuentaCreateSchema.parse(body);
    return await CuentaRepository.create(validated, createdBy);
  }
}
