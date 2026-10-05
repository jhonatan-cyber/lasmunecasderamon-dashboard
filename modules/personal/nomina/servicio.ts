import { PayrollRepository } from '@/modules/personal/nomina/repositorio';
import { enUnaUnidad } from '@/lib/transaccion/contrato';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { liquidarAsistencias } from '@/modules/asistencia';

export class PayrollService {
  static async getSummary() {
    return await PayrollRepository.getSummary();
  }

  static async pay(userId: string, entregadoPor?: string) {
    const fecha = getNowInBusinessTimezone();
    return enUnaUnidad(unidad =>
      unidad.ejecutar(async contexto => {
        await liquidarAsistencias(userId, fecha, contexto);
        await PayrollRepository.pay(userId, entregadoPor, fecha, contexto);
      })
    );
  }
}
