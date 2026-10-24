import { PayrollRepository } from '@/modules/personal/nomina/repositorio';
import { enUnaUnidad } from '@/lib/transaction/contract';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { liquidarAsistencias } from '@/modules/asistencia';

export class PayrollService {
  static async getSummary() {
    return await PayrollRepository.getSummary();
  }

  /**
   * Liquida al trabajador en una sola unidad: calcula el saldo (con el monto
   * esperado del cliente), liquida sus asistencias, ceroa los pendientes y
   * registra la liquidación. Si algo falla, no queda ni el registro ni los
   * estados tocados.
   */
  static async pay(userId: string, entregadoPor?: string, totalEsperado?: number) {
    const fecha = getNowInBusinessTimezone();
    return enUnaUnidad(unidad =>
      unidad.ejecutar(async contexto => {
        const resumen = await PayrollRepository.resumenParaPago(userId, totalEsperado, contexto);
        await liquidarAsistencias(userId, fecha, contexto);
        await PayrollRepository.registrarPago(userId, entregadoPor, fecha, resumen, contexto);
        return resumen;
      })
    );
  }
}
