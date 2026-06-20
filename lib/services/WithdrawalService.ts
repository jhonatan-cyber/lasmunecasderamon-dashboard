import { WithdrawalRepository } from '@/lib/repositories/WithdrawalRepository';
import { CashRegisterRepository } from '@/lib/repositories/CashRegisterRepository';
import { RetiroCajaSchema, type RetiroCajaType } from '@/lib/business/schemas/withdrawal';
import { withTransaction } from '@/lib/database/db';
import { ValidationError, BusinessError } from '@/lib/errors/errors';

export class WithdrawalService {
  static async getByCajaId(cajaId: string) {
    if (!cajaId) throw new ValidationError('ID de caja es requerido');
    return await WithdrawalRepository.getByCajaId(cajaId);
  }

  static async addRetiro(data: RetiroCajaType) {
    const validated = RetiroCajaSchema.parse(data);

    return await withTransaction(async trx => {
      let cajaId = validated.caja_id || validated.id_caja;

      if (!cajaId) {
        const rows = await trx<any[]>(
          'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
        );
        cajaId = rows[0]?.id_caja || null;
      }

      if (!cajaId)
        throw new BusinessError(
          'No hay una caja abierta para realizar el retiro',
          'NO_CAJA_ABIERTA'
        );

      const cajaRows = await trx<any[]>(
        'SELECT monto_apertura, efectivo FROM cajas WHERE id_caja = ? FOR UPDATE',
        [cajaId]
      );

      if (!cajaRows.length) {
        throw new BusinessError('La caja indicada no esta abierta', 'CAJA_NO_DISPONIBLE');
      }

      const efectivoDisponible =
        Number(cajaRows[0].monto_apertura || 0) + Number(cajaRows[0].efectivo || 0);

      if (efectivoDisponible < Number(validated.monto || 0)) {
        throw new BusinessError(
          'No hay suficiente efectivo en caja para realizar el retiro',
          'SALDO_CAJA_INSUFICIENTE',
          { efectivoDisponible, montoSolicitado: validated.monto }
        );
      }

      const idRetiro = await WithdrawalRepository.create(
        {
          ...validated,
          caja_id: cajaId
        },
        trx
      );

      await trx('UPDATE cajas SET efectivo = efectivo - ? WHERE id_caja = ?', [
        validated.monto,
        cajaId
      ]);

      return { id_retiro: idRetiro, caja_id: cajaId };
    });
  }
}
