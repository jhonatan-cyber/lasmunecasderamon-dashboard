import { useEffect } from 'react';
import { useServicios } from '@/hooks/useServicios';
import { useTimer } from '@/contexts/TimerContext';

export const useServicioTimerSync = () => {
  const { servicios } = useServicios();
  const { timers, pauseTimerByServicioId, resumeTimerByServicioId } = useTimer();

  useEffect(() => {
    // Sincronizar temporizadores con el estado de los servicios
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 Hook de sincronización ejecutándose - Servicios: ${servicios.length}, Timers: ${timers.length}`);
    }
    
    timers.forEach(timer => {
      const servicio = servicios.find(s => s.id_servicio === timer.servicioId);
      
      if (servicio) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔍 Verificando timer ${timer.servicioCode} (ID: ${timer.servicioId}) - Estado servicio: ${servicio.estado}, Timer pausado: ${timer.isPaused}`);
        }
        
        if (servicio.estado === 2 && !timer.isPaused) {
          // Servicio en estado pendiente (2) - pausar temporizador
          if (process.env.NODE_ENV === 'development') {
            console.log(`🔄 Sincronización: Pausando temporizador para servicio ${servicio.codigo} (estado: ${servicio.estado})`);
          }
          pauseTimerByServicioId(timer.servicioId);
        } else if (servicio.estado === 3 && timer.isActive) {
          // Servicio en estado devuelto (3) - detener temporizador
          if (process.env.NODE_ENV === 'development') {
            console.log(`🔄 Sincronización: Deteniendo temporizador para servicio ${servicio.codigo} (estado: ${servicio.estado})`);
          }
          // Aquí podríamos llamar a stopTimerByServicioId si fuera necesario
        }
        // NOTA: Removido el auto-reanudado para estado 1 para permitir pausado manual
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log(`⚠️ No se encontró servicio para timer ${timer.servicioCode} (ID: ${timer.servicioId})`);
        }
      }
    });
  }, [servicios, timers, pauseTimerByServicioId, resumeTimerByServicioId]);

  return null; // Este hook no retorna nada, solo sincroniza
}; 