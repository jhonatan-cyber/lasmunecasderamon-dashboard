import { CuentaCreateSchema } from '@/lib/business/schemas';
import { CuentaRepository } from '@/modules/operacion/cuentas/registro';
import type { CuentaUpdateBody, CuentaCobrarBody } from '@/modules/operacion/cuentas/registro';
import { z } from 'zod';

type AccountCreateInput = z.input<typeof CuentaCreateSchema>;

export class AccountService {
  static async create(body: AccountCreateInput, createdBy: string) {
    const validated = CuentaCreateSchema.parse(body);
    return await CuentaRepository.create(validated, createdBy);
  }

  /** @deprecated Usar create() */
  static async createAccountMovement(body: AccountCreateInput, createdBy: string) {
    return await AccountService.create(body, createdBy);
  }

  static async getAll(tipo?: string, estado?: string) {
    return await CuentaRepository.getAll(tipo, estado);
  }

  static async getById(id: string) {
    return await CuentaRepository.getById(id);
  }

  static async updateCuenta(id: string, body: CuentaUpdateBody, createdBy: string) {
    return await CuentaRepository.updateCuenta(id, body, createdBy);
  }

  static async cobrar(id: string, body: CuentaCobrarBody, cobradoPor: string) {
    return await CuentaRepository.cobrar(id, body, cobradoPor);
  }

  static async stopTimer(id: string, userId: string) {
    return await CuentaRepository.stopTimer(id, userId);
  }

  static async finalizeRoomSession(id: string, nowStr?: string) {
    return await CuentaRepository.finalizeRoomSession(id, nowStr);
  }

  static async requestAnulacion(
    id: string,
    reason: string,
    requestedBy: string,
    requestedAmount: number
  ) {
    return await CuentaRepository.requestAnulacion(id, reason, requestedBy, requestedAmount);
  }

  static async delete(id: string) {
    return await CuentaRepository.delete(id);
  }
}
