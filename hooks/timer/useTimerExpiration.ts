import { useState, useCallback } from 'react';
import { Timer, TimerExpiredNotification } from '@/contexts/TimerContext';
import { useTimerAudio } from '@/hooks/timer/useTimerAudio';
import logger from '@/lib/utils/logger';

interface UseTimerExpirationParams {
  timers: Timer[];
  serverOffset: number;
}

interface UseTimerExpirationReturn {
  timerExpiredNotification: TimerExpiredNotification | null;
  showTimerExpiredModal: boolean;
  setShowTimerExpiredModal: (show: boolean) => void;
  showTimerExpiredNotification: (timer: Timer) => void;
}

export function useTimerExpiration({
  timers,
  serverOffset
}: UseTimerExpirationParams): UseTimerExpirationReturn {
  const [timerExpiredNotification, setTimerExpiredNotification] =
    useState<TimerExpiredNotification | null>(null);
  const [showTimerExpiredModal, setShowTimerExpiredModal] = useState(false);

  const { playExpirationSound, announceExpiration } = useTimerAudio(timers, serverOffset);

  const showTimerExpiredNotificationFn = useCallback(
    (timer: Timer) => {
      if (timer.remainingTime > 0) {
        logger.warn(
          `[TimerContext] Ignorado modal expirado para id:${timer.id} (${timer.roomName}), tiene ${timer.remainingTime}s restantes.`
        );
        return;
      }

      logger.info(
        `[TimerContext] Abriendo modal para id:${timer.id} (${timer.roomName}) - tipo:${timer.tipoTransaccion}`
      );
      setTimerExpiredNotification({
        id: timer.id,
        roomName: timer.roomName,
        servicioCode: timer.servicioCode,
        clienteNombre: timer.clienteNombre,
        tiempoTotal: timer.duration,
        isTemporary: !!timer.isTemporary,
        tipoTransaccion: timer.tipoTransaccion || 'servicio',
        anfitrionas: timer.anfitrionas || '',
        waiterName: timer.waiterName
      });
      setShowTimerExpiredModal(true);
      playExpirationSound();
      announceExpiration(timer.roomName);
    },
    [playExpirationSound, announceExpiration]
  );

  return {
    timerExpiredNotification,
    showTimerExpiredModal,
    setShowTimerExpiredModal,
    showTimerExpiredNotification: showTimerExpiredNotificationFn
  };
}
