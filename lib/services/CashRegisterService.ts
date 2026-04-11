import { CajaOpenSchema, CajaCloseSchema, CajaUpdateSchema } from '@/lib/business/schemas';
import { CashRegisterRepository } from '@/lib/repositories/CashRegisterRepository';
import { z } from 'zod';

type CajaOpenInput = z.input<typeof CajaOpenSchema>;
type CajaCloseInput = z.input<typeof CajaCloseSchema>;
type CajaUpdateInput = Omit<z.input<typeof CajaUpdateSchema>, 'id_caja'>;

export class CashRegisterService {
  static async openCaja(body: CajaOpenInput) {
    const validated = CajaOpenSchema.parse(body);
    return await CashRegisterRepository.open(validated.usuario_id_apertura, validated.monto_apertura);
  }

  static async closeCaja(body: CajaCloseInput) {
    const validated = CajaCloseSchema.parse(body);
    return await CashRegisterRepository.close(validated.id_caja, validated.usuario_id_cierre);
  }

  static async updateCaja(id: string, body: CajaUpdateInput) {
    const validated = CajaUpdateSchema.omit({ id_caja: true }).parse(body);
    return await CashRegisterRepository.update(id, validated);
  }
}

