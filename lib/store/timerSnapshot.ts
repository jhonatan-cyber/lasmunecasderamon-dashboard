import { batch } from '@preact/signals-react';
import { activeTimers, serverOffsetSignal, TimerInstance, type TimerData } from './timerStore';
import { calculateRemainingTime, parseDateSafe } from '@/lib/utils/timeUtils';
import { synchronizeTimerClock } from '@/lib/utils/timerClock';

let pending: Promise<void> | undefined;

// Todas las vias (alta, SSE, reconexion y sondeo) usan el mismo estado confirmado.
export function refreshTimerSnapshot(afterMutation = false): Promise<void> {
  if (pending) return afterMutation ? pending.then(() => refreshTimerSnapshot()) : pending;
  pending = fetch('/api/timers/active?source=web', { cache: 'no-store' })
    .then(async response => {
      if (!response.ok) throw new Error('No se pudieron sincronizar los temporizadores');
      const snapshot = await response.json();
      const receivedAt = performance.now();
      if (!snapshot.success || !Array.isArray(snapshot.data) || !snapshot.serverTime) {
        throw new Error('Respuesta de temporizadores invalida');
      }
      const offset = synchronizeTimerClock(snapshot.serverTime, receivedAt);
      const previous = new Map(
        activeTimers.peek().map(t => [`${t.tipoTransaccion.peek()}:${t.servicioId}`, t])
      );
      batch(() => {
        serverOffsetSignal.value = offset;
        activeTimers.value = snapshot.data.flatMap((row: any) => {
          const startTime = parseDateSafe(row.startTime);
          const duration = Number(row.duration || 0);
          const isPaused = row.isPaused === true;
          const expiresAt =
            row.expiresAt || new Date(startTime.getTime() + duration * 60000).toISOString();
          const remaining = calculateRemainingTime(
            {
              startTime,
              expiresAt,
              duration,
              isPaused,
              remainingTime: Number(row.remainingTime || 0)
            },
            offset
          );
          if (remaining <= 0 && !isPaused) return [];
          const tipoTransaccion = row.tipoTransaccion || 'servicio';
          const servicioId = String(row.servicioId ?? row.id);
          const data: TimerData = {
            id: `${tipoTransaccion}-${servicioId}`,
            servicioId,
            roomId: String(row.roomId ?? ''),
            roomName: row.roomName ?? '',
            startTime,
            expiresAt,
            duration,
            isPaused,
            isActive: true,
            servicioCode: row.codigo ?? '',
            clienteNombre: row.clienteNombre ?? 'Sin Nombre',
            tipoTransaccion,
            anfitrionas: row.anfitrionas ?? '',
            isTemporary: row.isTemporary === true,
            datosTemporales: row.isTemporary
              ? {
                  servicio_original_id: row.servicioOriginalId
                    ? String(row.servicioOriginalId)
                    : null,
                  tiempo_principal_congelado: snapshot.data.find(
                    (t: any) => String(t.servicioId) === String(row.servicioOriginalId)
                  )?.remainingTime
                }
              : undefined
          };
          const existing = previous.get(`${tipoTransaccion}:${servicioId}`);
          if (!existing) return [new TimerInstance(data, remaining)];
          existing.patch(data);
          existing.remainingSeconds.value = remaining;
          return [existing];
        });
      });
    })
    .finally(() => {
      pending = undefined;
    });
  return pending;
}
