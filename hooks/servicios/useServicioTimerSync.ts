import { useEffect } from 'react';
import { useServicios } from '@/hooks/servicios/useServicios';
import { useTimer } from '@/contexts/TimerContext';

export const useServicioTimerSync = () => {
  const { servicios } = useServicios();
  const { timers, pauseTimerByServicioId, resumeTimerByServicioId } = useTimer();

  useEffect(() => {
    if (!servicios) return;

    timers.forEach(timer => {
      const servicio = servicios.find(s => String(s.id_servicio) === String(timer.servicioId));
      
      if (servicio) {
        if (servicio.estado === 2 && !timer.isPaused) {
          pauseTimerByServicioId(timer.servicioId);
        }
      }
    });
  }, [servicios, timers, pauseTimerByServicioId, resumeTimerByServicioId]);

  return null; 
}; 