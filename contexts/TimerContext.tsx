/* eslint-disable */
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef
} from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { toast } from 'sonner';
import { TimerExpiredModal } from '@/components/notifications';

import { useTimerActions } from '@/hooks/timer/useTimerActions';
import { useTimerSync } from '@/hooks/timer/useTimerSync';
import { useTimerExpiration } from '@/hooks/timer/useTimerExpiration';
import {
  activeTimers,
  startGlobalTimerLoop,
  stopGlobalTimerLoop,
  syncTimersWithSignals,
  serverOffsetSignal,
  TimerInstance,
  setGlobalExpirationHandler
} from '@/lib/store/timerStore';
import logger from '@/lib/utils/logger';

export { saveTimersToStorage, loadTimersFromStorage } from '@/hooks/timer/useTimerPersistence';

export interface Timer {
  id: string;
  servicioId: string;
  roomId: string;
  roomName: string;
  duration: number;
  remainingTime: number;
  isActive: boolean;
  isPaused: boolean;
  pausedByTemp?: boolean;
  startTime: Date;
  servicioCode: string;
  clienteNombre: string;
  isTemporary?: boolean;
  onComplete?: () => void;
  datosTemporales?: any;
  tipoTransaccion?: 'servicio' | 'venta' | 'cuenta';
  anfitrionas?: string;
  waiterName?: string;
  lastAnnouncedMinute?: number;
}

export interface TimerExpiredNotification {
  id: string;
  roomName: string;
  servicioCode: string;
  clienteNombre: string;
  tiempoTotal: number;
  isTemporary: boolean;
  tipoTransaccion: 'servicio' | 'venta' | 'cuenta';
  anfitrionas: string;
  waiterName?: string;
}

interface TimerContextType {
  timers: Timer[];
  startTimer: (
    servicioId: string,
    roomId: string,
    roomName: string,
    duration: number,
    servicioCode: string,
    clienteNombre: string,
    anfitrionas?: string,
    tipoTransaccion?: 'servicio' | 'venta' | 'cuenta',
    solicitado_por?: string
  ) => Promise<void>;
  stopTimer: (id: string, isManual?: boolean, timerInfo?: Partial<Timer>) => Promise<void>;
  stopTimerByRoomId: (roomId: string) => Promise<void>;
  stopTimerByServicioId: (servicioId: string) => Promise<void>;
  pauseTimerByServicioId: (servicioId: string) => void;
  resumeTimerByServicioId: (servicioId: string) => void;
  getTimerByRoomId: (roomId: string) => Timer | undefined;
  getTimerByServicioId: (servicioId: string) => Timer | undefined;
  getTemporaryTimerByServicioId: (sid: string) => Timer | undefined;
  formatTime: (seconds: number) => string;
  serverOffset: number;
  getAccurateNow: () => Date;
  setRefreshCallback: (callback: (servicioId?: string | number) => void) => void;
  updateTimerByServicioId: (servicioId: string, newDuration: number) => void;
  startTemporaryTimer: (
    servicioId: string,
    roomId: string,
    roomName: string,
    duration: number,
    servicioCode: string,
    clienteNombre: string,
    onComplete: () => void,
    datosTemporales?: any,
    anfitrionas?: string
  ) => void;
  stopTemporaryTimer: (sid: string) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

const formatTime = (seconds: number) => {
  const absSecs = Math.max(0, Math.abs(seconds));
  const m = Math.floor(absSecs / 60);
  const s = absSecs % 60;
  return `${seconds < 0 ? '-' : ''}${m}:${s.toString().padStart(2, '0')}`;
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) throw new Error('useTimer debe ser usado dentro de TimerProvider');
  return context;
};

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useSignals();
  const [isInitialized, setIsInitialized] = useState(false);
  const [serverOffset, setServerOffset] = useState(0);
  const refreshCallbackRef = useRef<((servicioId?: string | number) => void) | null>(null);

  const setRefreshCallback = useCallback((callback: (servicioId?: string | number) => void) => {
    refreshCallbackRef.current = callback;
  }, []);

  const timers = useMemo(
    () => activeTimers.value.map(t => t.toPlainObject() as Timer),
    [activeTimers.value]
  );

  useEffect(() => {
    serverOffsetSignal.value = serverOffset;
  }, []);

  const {
    timerExpiredNotification,
    showTimerExpiredModal,
    setShowTimerExpiredModal,
    showTimerExpiredNotification
  } = useTimerExpiration({ timers, serverOffset });

  const {
    startTimer,
    stopTimer,
    pauseTimerByServicioId,
    resumeTimerByServicioId,
    startTemporaryTimer
  } = useTimerActions({
    onNotificationExpira: showTimerExpiredNotification,
    onRefreshCaja: id => refreshCallbackRef.current?.(id)
  });

  useTimerSync({
    isInitialized,
    setIsInitialized,
    setServerOffset,
    onTimerStopped: id => refreshCallbackRef.current?.(id)
  });

  useEffect(() => {
    startGlobalTimerLoop();
    setGlobalExpirationHandler(instance => {
      const timer = instance.toPlainObject() as Timer;
      logger.info('[TimerContext] Timer expirado', {
        servicioId: timer.servicioId,
        roomName: timer.roomName
      });
      showTimerExpiredNotification(timer);

      if (timer.isTemporary) {
        activeTimers.value = activeTimers.peek().filter(x => x.id !== timer.id);

        const mainTimer = activeTimers
          .peek()
          .find(t => t.servicioId === timer.servicioId && !t.isTemporary);
        if (mainTimer) {
          mainTimer.isPaused.value = false;
        }
      } else {
        logger.info('[TimerContext] Llamando stopTimer para', {
          id: timer.id,
          servicioId: timer.servicioId
        });
        stopTimer(timer.id, false, timer);

        if (refreshCallbackRef.current) {
          logger.info('[TimerContext] Llamando refreshCallback para:', timer.servicioId);
          refreshCallbackRef.current(timer.servicioId);
        }
      }
    });
    return () => {
      stopGlobalTimerLoop();
      setGlobalExpirationHandler(() => {});
    };
  }, [showTimerExpiredNotification, stopTimer, resumeTimerByServicioId]);

  const stopTimerByRoomId = useCallback(
    async (roomId: string) => {
      const t = timers.find(x => x.roomId === roomId);
      if (t) await stopTimer(t.id);
    },
    [timers, stopTimer]
  );

  const stopTimerByServicioId = useCallback(
    async (sid: string) => {
      const t = timers.find(x => x.servicioId === sid);
      if (t) await stopTimer(t.id, true, t);
    },
    [timers, stopTimer]
  );

  const getTimerByRoomId = useCallback(
    (rid: string) => timers.find(t => t.roomId === rid),
    [timers]
  );
  const getTimerByServicioId = useCallback(
    (sid: string) => timers.find(t => t.servicioId === sid && !t.isTemporary),
    [timers]
  );
  const getTemporaryTimerByServicioId = useCallback(
    (sid: string) => timers.find(t => t.servicioId === sid && t.isTemporary),
    [timers]
  );
  const getAccurateNow = useCallback(() => new Date(Date.now() + serverOffset), [serverOffset]);

  const updateTimerByServicioId = useCallback((sid: string, dur: number) => {
    const target = activeTimers.peek().find(t => t.servicioId === sid);
    if (target) {
      activeTimers.value = activeTimers
        .peek()
        .map(t =>
          t.servicioId === sid
            ? new TimerInstance({ ...(t.toPlainObject() as any), duration: dur }, dur * 60)
            : t
        );
      toast.info(`Tiempo actualizado a ${dur} min`);
    }
  }, []);

  const stopTemporaryTimer = useCallback(
    (sid: string) => {
      const temp = activeTimers.peek().find(t => t.servicioId === sid && t.isTemporary);
      if (temp) {
        activeTimers.value = activeTimers.peek().filter(t => t.id !== temp.id);
        setTimeout(() => resumeTimerByServicioId(sid), 200);
      }
    },
    [resumeTimerByServicioId]
  );

  const value = useMemo(
    () => ({
      timers,
      startTimer,
      stopTimer,
      stopTimerByRoomId,
      stopTimerByServicioId,
      pauseTimerByServicioId,
      resumeTimerByServicioId,
      getTimerByRoomId,
      getTimerByServicioId,
      getTemporaryTimerByServicioId,
      formatTime,
      serverOffset,
      getAccurateNow,
      setRefreshCallback,
      updateTimerByServicioId,
      startTemporaryTimer,
      stopTemporaryTimer,
      isInitialized
    }),
    [
      timers,
      startTimer,
      stopTimer,
      stopTimerByRoomId,
      stopTimerByServicioId,
      pauseTimerByServicioId,
      resumeTimerByServicioId,
      getTimerByRoomId,
      getTimerByServicioId,
      getTemporaryTimerByServicioId,
      serverOffset,
      getAccurateNow,
      setRefreshCallback,
      updateTimerByServicioId,
      startTemporaryTimer,
      stopTemporaryTimer,
      isInitialized
    ]
  );

  useEffect(() => {
    logger.info('[TimerContext] isInitialized', { isInitialized, timersCount: timers.length });
  }, [isInitialized, timers.length]);

  return (
    <TimerContext.Provider value={value}>
      {children}
      {timerExpiredNotification && (
        <TimerExpiredModal
          open={showTimerExpiredModal}
          onOpenChange={setShowTimerExpiredModal}
          roomName={timerExpiredNotification.roomName}
          servicioCode={timerExpiredNotification.servicioCode}
          clienteNombre={timerExpiredNotification.clienteNombre}
          tiempoTotal={timerExpiredNotification.tiempoTotal}
          isTemporary={timerExpiredNotification.isTemporary}
          tipoTransaccion={timerExpiredNotification.tipoTransaccion}
          anfitrionas={timerExpiredNotification.anfitrionas}
        />
      )}
    </TimerContext.Provider>
  );
};

export const useCountdown = (timer: Timer | undefined | null) => {
  useSignals();

  if (!timer) return 0;

  const activeInstance = activeTimers.value.find(t => t.id === timer.id);

  if (activeInstance) {
    return activeInstance.remainingSeconds.value;
  }

  return timer.remainingTime;
};
