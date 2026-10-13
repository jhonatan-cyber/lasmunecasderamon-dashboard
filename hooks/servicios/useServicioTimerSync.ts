'use client';

import { useEffect } from 'react';
import { useServicios } from '@/hooks/servicios/useServicios';
import { useTimer } from '@/contexts/TimerContext';

export const useServicioTimerSync = () => {
  const { servicios } = useServicios();
  const { timers, pauseTimerByServicioId } = useTimer();

  useEffect(() => {
    if (!servicios) return;

    timers.forEach(timer => {
      const servicio = servicios.find(
        s => String(s.id_servicio ?? s.id) === String(timer.servicioId)
      );

      if (servicio) {
        if (
          servicio.estado === 3 &&
          !timer.isPaused &&
          !timer.isTemporary &&
          timer.tipoTransaccion === 'servicio'
        ) {
          pauseTimerByServicioId(timer.servicioId);
        }
      }
    });
  }, [servicios, timers, pauseTimerByServicioId]);

  return null;
};
