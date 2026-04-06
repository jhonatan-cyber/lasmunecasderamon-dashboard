import { WithdrawalRepository } from '@/lib/repositories/WithdrawalRepository';
import { CashRegisterRepository } from '@/lib/repositories/CashRegisterRepository';
import { RetiroCajaSchema, type RetiroCajaType } from '@/lib/business/schemas/withdrawal';
import { withTransaction } from '@/lib/database/db';

export class WithdrawalService {
  static async getByCajaId(cajaId: string) {
    if (!cajaId) throw new Error('ID de caja es requerido');
    return await WithdrawalRepository.getByCajaId(cajaId);
  }

  static async addRetiro(data: RetiroCajaType) {
    const validated = RetiroCajaSchema.parse(data);

    return await withTransaction(async (trx) => {
      let cajaId = validated.caja_id;
      if (!cajaId) {
        cajaId = await CashRegisterRepository.getCurrentCajaId(trx);
      }

      if (!cajaId) throw new Error('No hay una caja abierta para realizar el retiro');

      const idRetiro = await WithdrawalRepository.create({
        ...validated,
        caja_id: cajaId
      });

      await CashRegisterRepository.updateBalances(trx, cajaId, {
        efectivo: -validated.monto
      });

      return { id_retiro: idRetiro, caja_id: cajaId };
    });
  }
}
