import { useCallback, useEffect, useRef } from 'react';
import { Timer } from '@/contexts/TimerContext';
import { announceVoice, playNotificationSound } from '@/lib/utils/audioUtils';
import { activeTimers, serverOffsetSignal } from '@/lib/store/timerStore';

export function useTimerAudio(timers: Timer[], serverOffset: number) {
  
  const lastAnnouncedRef = useRef<Record<string, number>>({});

  useEffect(() => {
    
    const interval = setInterval(() => {
      activeTimers.peek().forEach(instance => {
        if (!instance.isActive.peek() || instance.isPaused.peek() || instance.isTemporary) return;

        const remSeconds = instance.remainingSeconds.peek();
        const remMinutes = Math.floor(remSeconds / 60);

        if (
          (remMinutes === 5 || remMinutes === 1) &&
          lastAnnouncedRef.current[instance.id] !== remMinutes &&
          remSeconds > 0
        ) {
          announceVoice(
            `Atención: quedan ${remMinutes} minuto${remMinutes >= 1 ? 's' : ''} en ${instance.roomName}`
          );
          lastAnnouncedRef.current[instance.id] = remMinutes;
        }
      });

      const currentIds = new Set(activeTimers.peek().map(t => t.id));
      Object.keys(lastAnnouncedRef.current).forEach(id => {
        if (!currentIds.has(id)) {
          delete lastAnnouncedRef.current[id];
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const playExpirationSound = useCallback(() => {
    playNotificationSound();
  }, []);

  const announceExpiration = useCallback((roomName: string) => {
    announceVoice(`Servicio terminado en ${roomName}`);
  }, []);

  return {
    playExpirationSound,
    announceExpiration
  };
}
