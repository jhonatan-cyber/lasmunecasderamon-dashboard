import { useEffect, useRef } from 'react';
import { useTimer } from '@/contexts/TimerContext';

export const useTimerVerification = () => {
  const { timers } = useTimer();
  const prevTimersRef = useRef(timers);

  // Comentado para evitar logs cada segundo
  // useEffect(() => {
  //   // Verificar cambios en los temporizadores
  //   if (prevTimersRef.current !== timers) {
  //     console.log('🔄 CAMBIO DETECTADO en temporizadores:');
  //     console.log('Antes:', prevTimersRef.current.map(t => ({ 
  //       servicioCode: t.servicioCode, 
  //       isPaused: t.isPaused, 
  //       remainingTime: t.remainingTime 
  //     })));
  //     console.log('Después:', timers.map(t => ({ 
  //       servicioCode: t.servicioCode, 
  //       isPaused: t.isPaused, 
  //       remainingTime: t.remainingTime 
  //     })));
  //     
  //     prevTimersRef.current = timers;
  //   }
  // }, [timers]);

  return null;
}; 