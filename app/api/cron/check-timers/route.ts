import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { getNowInBusinessTimezone, getSystemTimezone } from '@/lib/business/timezoneService';
import { checkWarehouseContainerAlerts } from '@/lib/business/containerAlerts';
import { reavisarCierresPendientes } from '@/lib/business/cierreCajaRecordatorios';
import { revisarTemporizadores } from '@/modules/operacion';

export const dynamic = 'force-dynamic';

const globalForCron = globalThis as typeof globalThis & { __attendanceCheckDate?: string };

/**
 * Chequeo periódico. El aviso de 5 minutos, el cierre y la liberación de habitación
 * viven en el módulo de Operación; acá sólo queda lo que es del proceso que
 * dispara: los dos avisos que nunca lanzan y el recordatorio diario de asistencia.
 */
export const GET = withPublicRoute(async () => {
  // Control de envases: si cambió cuántos llevan más de 2 horas entregados sin
  // recibir, avisa al almacén (SSE en vivo + campana + push) y si no, no hace
  // ruido. Nunca lanza, así que no puede tumbar el resto del chequeo.
  await checkWarehouseContainerAlerts();

  // Cierres de caja sin respuesta: vuelve a avisar al administrador por WhatsApp de los
  // que ya vencieron su último aviso y siguen dentro de la ventana de recordatorios, así
  // un cierre no queda en el olvido si el cajero se fue sin insistir. Nunca lanza.
  await reavisarCierresPendientes();

  const bizNow = getNowInBusinessTimezone();
  const tz = getSystemTimezone();
  const localHour = parseInt(bizNow.substring(11, 13), 10);
  const todayStr = bizNow.substring(0, 10);

  if (localHour === 21 && globalForCron.__attendanceCheckDate !== todayStr) {
    globalForCron.__attendanceCheckDate = todayStr;
    sendNotificationToAll('check_attendance', {
      roles: ['cajero', 'garzon', 'anfitriona'],
      message: 'Verifica tu asistencia del día'
    });
  }

  await revisarTemporizadores(new Date(bizNow.replace(' ', 'T')));

  return NextResponse.json({ success: true, timestamp: bizNow });
});
