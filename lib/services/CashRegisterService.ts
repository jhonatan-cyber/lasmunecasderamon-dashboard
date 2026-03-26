import { CajaOpenSchema, CajaCloseSchema, CajaUpdateSchema } from '@/lib/business/schemas';
import { CashRegisterRepository } from '@/lib/repositories/CashRegisterRepository';

export class CashRegisterService {
  static async openCaja(body: any) {
    const validated = CajaOpenSchema.parse(body);
    return await CashRegisterRepository.open(validated.usuario_id_apertura, validated.monto_apertura);
  }

  static async closeCaja(body: any) {
    const validated = CajaCloseSchema.parse(body);
    return await CashRegisterRepository.close(validated.id_caja, validated.usuario_id_cierre);
  }

  static async updateCaja(id: string, body: any) {
    const validated = CajaUpdateSchema.omit({ id: true }).parse(body);
    return await CashRegisterRepository.update(id, validated);
  }
}
