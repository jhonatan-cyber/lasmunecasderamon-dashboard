import { CashRegisterService } from '@/modules/caja';
import { avisarCierreAlAdministrador } from '@/lib/api/cierreCaja';
import logger from '@/lib/utils/logger';

/**
 * Vuelve a avisar al administrador de los cierres de caja que quedaron sin respuesta.
 *
 * Es el reintento **automático** del aviso: corre desde el cron (`cron/check-timers`) y evita
 * que un cierre quede en el olvido solo porque el WhatsApp no llegó o nadie lo miró. El
 * cajero ya tiene su botón para reenviar a mano, pero si se fue sin insistir, este aviso sale
 * igual.
 *
 * Qué recuerda y cuándo lo decide el repositorio (`cierresPendientesParaRecordar`): solo
 * pendientes de cajas abiertas, cuyo último aviso venció (`AVISO_CIERRE_REINTENTO_MS`) y que
 * siguen dentro de la ventana de recordatorios (`AVISO_CIERRE_VENTANA_MS`). Fuera de esa
 * ventana no insiste más: pasarla, la salida es que el cajero pida el cierre de nuevo.
 *
 * Sella `ultimo_aviso_en` **después** de que el WhatsApp sale, igual que el reenvío manual,
 * así un fallo de Twilio no cuenta como aviso dado. Nunca lanza: un error aquí no puede
 * tumbar el resto del chequeo del cron.
 *
 * @returns cuántos recordatorios salieron de verdad (0 si no había ninguno).
 */
export async function reavisarCierresPendientes(): Promise<number> {
  let enviados = 0;

  try {
    const pendientes = await CashRegisterService.cierresPendientesParaRecordar();

    for (const pendiente of pendientes) {
      try {
        const caja = await CashRegisterService.getById(pendiente.caja_id);
        if (!caja || Number(caja.estado) !== 1) continue;

        await avisarCierreAlAdministrador({
          cajaId: pendiente.caja_id,
          caja: caja as Record<string, any>,
          cajeroNombre: pendiente.solicitado_por,
          saldoClientes: Number(pendiente.saldo_clientes_descontado || 0),
          montoCierre: Number(pendiente.monto_cierre_calculado || 0),
          motivo: pendiente.motivo,
          token: pendiente.token,
          reenvio: true
        });

        await CashRegisterService.registrarAvisoCierre(pendiente.token);
        enviados++;
      } catch (err) {
        // Un aviso que falla no puede frenar los demás cierres pendientes.
        logger.error('[cierreCajaRecordatorios] No se pudo recordar un cierre pendiente:', {
          caja_id: pendiente.caja_id,
          err
        });
      }
    }
  } catch (err) {
    logger.captureException(err, { context: 'reavisarCierresPendientes' });
  }

  return enviados;
}
