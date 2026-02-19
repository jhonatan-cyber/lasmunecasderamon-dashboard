import { useEffect } from 'react';
import { useServicios } from '@/hooks/servicios/useServicios';
import { useTimer } from '@/contexts/TimerContext';

export const useServicioTimerSync = () => {
  const { servicios } = useServicios();
  const { timers, pauseTimerByServicioId, resumeTimerByServicioId } = useTimer();

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
       timers.forEach(timer => {
       
          const servicio = servicios.find(s => s.id_servicio === timer.servicioId);
          if (servicio) {

          } else {
           
          }
          
      });
    }
    
    timers.forEach(timer => {
      const servicio = servicios.find(s => s.id_servicio === timer.servicioId);
      
      if (servicio) {
        if (process.env.NODE_ENV === 'development') {
  
        }
        
        if (servicio.estado === 2 && !timer.isPaused) {
         
          if (process.env.NODE_ENV === 'development') {

          }
          pauseTimerByServicioId(timer.servicioId);
        } else if (servicio.estado === 3 && timer.isActive) {
         
          if (process.env.NODE_ENV === 'development') {

          }
      
        }
      
      } else {
        if (process.env.NODE_ENV === 'development') {
  
        }
      }
    });
  }, [servicios, timers, pauseTimerByServicioId, resumeTimerByServicioId]);

  return null; 
}; 