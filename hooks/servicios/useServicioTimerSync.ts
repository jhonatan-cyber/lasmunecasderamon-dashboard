import { useEffect } from 'react';
import { useServicios } from '@/hooks/servicios/useServicios';
import { useTimer } from '@/contexts/TimerContext';

export const useServicioTimerSync = () => {
  const { servicios } = useServicios();
  const { timers, pauseTimerByServicioId, resumeTimerByServicioId } = useTimer();

  useEffect(() => {
    // Sincronizar temporizadores con el estado de los servicios
    if (process.env.NODE_ENV === 'development') {
  
    }
    
    timers.forEach(timer => {
      const servicio = servicios.find(s => s.id_servicio === timer.servicioId);
      
      if (servicio) {
        if (process.env.NODE_ENV === 'development') {
  
        }
        
        if (servicio.estado === 2 && !timer.isPaused) {
          // Servicio en estado pendiente (2) - pausar temporizador
          if (process.env.NODE_ENV === 'development') {

          }
          pauseTimerByServicioId(timer.servicioId);
        } else if (servicio.estado === 3 && timer.isActive) {
          // Servicio en estado devuelto (3) - detener temporizador
          if (process.env.NODE_ENV === 'development') {

          }
          // Aquí podríamos llamar a stopTimerByServicioId si fuera necesario
        }
        // NOTA: Removido el auto-reanudado para estado 1 para permitir pausado manual
      } else {
        if (process.env.NODE_ENV === 'development') {
  
        }
      }
    });
  }, [servicios, timers, pauseTimerByServicioId, resumeTimerByServicioId]);

  return null; // Este hook no retorna nada, solo sincroniza
}; 