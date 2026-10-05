import { TimerRepository } from '@/modules/operacion/temporizadores/consultas';
import { enUnaUnidad } from '@/lib/transaccion/contrato';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { sendNotificationToAll } from '@/lib/api/sseService';

export class TimerService {
  static async getActive() {
    return await TimerRepository.getActive();
  }

  static async runAutoCleanup() {
    const fecha = getNowInBusinessTimezone();
    const resultado = await enUnaUnidad(unidad =>
      unidad.ejecutar(contexto => TimerRepository.limpiarEnUnidad(contexto, fecha))
    );
    for (const cuentaId of resultado.cuentas)
      sendNotificationToAll('timer_stopped', {
        servicioId: cuentaId,
        status: 1,
        tipoTransaccion: 'cuenta'
      });
    if (resultado.changed) sendNotificationToAll('timers_updated', { timestamp: fecha });
  }
}
