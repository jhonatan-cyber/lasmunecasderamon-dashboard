/* eslint-disable */
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { useConfirmModal } from '@/hooks/shared/useConfirmModal';
import { TimerExpiredModal } from '@/components/notifications';
import { parseDateSafe, calculateRemainingTime, formatTime } from '@/lib/utils/timeUtils';

import { useTimerAudio } from '@/hooks/timer/useTimerAudio';
import { useTimerSync } from '@/hooks/timer/useTimerSync';
import { useTimerActions } from '@/hooks/timer/useTimerActions';
import { activeTimers, startGlobalTimerLoop, stopGlobalTimerLoop, syncTimersWithSignals, serverOffsetSignal, TimerInstance, setGlobalExpirationHandler } from '@/lib/store/timerStore';

export interface Timer {
  id: string;
  servicioId: string;
  roomId: string;
  roomName: string;
  duration: number; // en minutos
  remainingTime: number; // en segundos
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
  startTimer: (servicioId: string, roomId: string, roomName: string, duration: number, servicioCode: string, clienteNombre: string, anfitrionas?: string, tipoTransaccion?: 'servicio' | 'venta' | 'cuenta', solicitado_por?: string) => Promise<void>;
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
  startTemporaryTimer: (servicioId: string, roomId: string, roomName: string, duration: number, servicioCode: string, clienteNombre: string, onComplete: () => void, datosTemporales?: any, anfitrionas?: string) => void;
  stopTemporaryTimer: (sid: string) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const saveTimersToStorage = (timers: Timer[]) => {
  if (typeof window !== 'undefined') localStorage.setItem('roomTimers', JSON.stringify(timers));
};

export const loadTimersFromStorage = (): Timer[] => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('roomTimers');
    if (stored) {
      return JSON.parse(stored).map((t: any) => ({ ...t, startTime: parseDateSafe(t.startTime) }));
    }
  }
  return [];
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
  const [timerExpiredNotification, setTimerExpiredNotification] = useState<TimerExpiredNotification | null>(null);
  const [showTimerExpiredModal, setShowTimerExpiredModal] = useState(false);
  const { modalState, showConfirm, closeModal } = useConfirmModal();

  // Exponer setRefreshCallback que guarda en ref en lugar de estado
  const setRefreshCallback = useCallback((callback: (servicioId?: string | number) => void) => {
    refreshCallbackRef.current = callback;
  }, []);

  // El array de timers para compatibilidad con componentes que no usan signals
  const timers = useMemo(() => activeTimers.value.map(t => t.toPlainObject() as Timer), [activeTimers.value]);

  useEffect(() => {
    serverOffsetSignal.value = serverOffset;
  }, []);

  const { playExpirationSound, announceExpiration } = useTimerAudio(timers, serverOffset);

  const showTimerExpiredNotification = useCallback((timer: Timer) => {
    // PROTECCIÓN CRÍTICA: No mostrar notificación si el timer aún tiene tiempo.
    // Esto previene que falsos positivos de sincronización disparen el modal.
    if (timer.remainingTime > 0) {
      console.warn(`[TimerContext] Ignorado modal expirado para id:${timer.id} (${timer.roomName}), tiene ${timer.remainingTime}s restantes.`);
      return;
    }

    console.log(`[TimerContext] Abriendo modal para id:${timer.id} (${timer.roomName}) - tipo:${timer.tipoTransaccion}`);
    setTimerExpiredNotification({
      id: timer.id, roomName: timer.roomName, servicioCode: timer.servicioCode,
      clienteNombre: timer.clienteNombre, tiempoTotal: timer.duration,
      isTemporary: !!timer.isTemporary, tipoTransaccion: timer.tipoTransaccion || 'servicio',
      anfitrionas: timer.anfitrionas || '', waiterName: timer.waiterName
    });
    setShowTimerExpiredModal(true);
    playExpirationSound();
    announceExpiration(timer.roomName);
  }, [playExpirationSound, announceExpiration]);

  const { startTimer, stopTimer, pauseTimerByServicioId, resumeTimerByServicioId, startTemporaryTimer } = useTimerActions({
    onNotificationExpira: showTimerExpiredNotification,
    onRefreshCaja: (id) => refreshCallbackRef.current?.(id)
  });

  useTimerSync({
    isInitialized, setIsInitialized,
    setServerOffset,
    onTimerStopped: (id) => refreshCallbackRef.current?.(id)
  });

  useEffect(() => {
    startGlobalTimerLoop();
    setGlobalExpirationHandler((instance) => {
      const timer = instance.toPlainObject() as Timer;
      console.log('[TimerContext] Timer expirado:', timer.servicioId, timer.roomName);
      showTimerExpiredNotification(timer);

      if (timer.isTemporary) {
        activeTimers.value = activeTimers.peek().filter(x => x.id !== timer.id);
        // Reanudar el timer PRINCIPAL localmente (isPaused=false) SIN llamar al API
        // El callback onExpire del temporal ya manejó la limpieza en servidor (PATCH a estado=0
        // que dispara resumeRoomLogic). Llamar PATCH estado:2 aparte RACEARÍA con eso.
        // Solo necesitamos que el timer local del principal deje de estar pausado.
        const mainTimer = activeTimers.peek().find(
          t => t.servicioId === timer.servicioId && !t.isTemporary
        );
        if (mainTimer) {
          mainTimer.isPaused.value = false;
        }
      } else {
        console.log('[TimerContext] Llamando stopTimer para:', timer.id, timer.servicioId);
        stopTimer(timer.id, false, timer);
        
        // Llamar al callback de refresh para actualizar la lista de servicios
        if (refreshCallbackRef.current) {
          console.log('[TimerContext] Llamando refreshCallback para:', timer.servicioId);
          refreshCallbackRef.current(timer.servicioId);
        }
      }
    });
    return () => {
      stopGlobalTimerLoop();
      setGlobalExpirationHandler(() => { });
    };
  }, [showTimerExpiredNotification, stopTimer, resumeTimerByServicioId]);

  const stopTimerByRoomId = useCallback(async (roomId: string) => {
    const t = timers.find(x => x.roomId === roomId);
    if (t) await stopTimer(t.id);
  }, [timers, stopTimer]);

  const stopTimerByServicioId = useCallback(async (sid: string) => {
    const t = timers.find(x => x.servicioId === sid);
    if (t) await stopTimer(t.id, true, t);
  }, [timers, stopTimer]);

  const getTimerByRoomId = (rid: string) => timers.find(t => t.roomId === rid);
  const getTimerByServicioId = (sid: string) => timers.find(t => t.servicioId === sid && !t.isTemporary);
  const getTemporaryTimerByServicioId = (sid: string) => timers.find(t => t.servicioId === sid && t.isTemporary);
  const getAccurateNow = useCallback(() => new Date(Date.now() + serverOffset), [serverOffset]);

  const updateTimerByServicioId = useCallback((sid: string, dur: number) => {
    const target = activeTimers.peek().find(t => t.servicioId === sid);
    if (target) {
      // En una clase con props readonly recreamos la instancia si hay cambio estructural
      activeTimers.value = activeTimers.peek().map(t => t.servicioId === sid ? new TimerInstance({ ...t.toPlainObject() as any, duration: dur }, dur * 60) : t);
      toast.info(`Tiempo actualizado a ${dur} min`);
    }
  }, []);

  const stopTemporaryTimer = useCallback((sid: string) => {
    const temp = activeTimers.peek().find(t => t.servicioId === sid && t.isTemporary);
    if (temp) {
      activeTimers.value = activeTimers.peek().filter(t => t.id !== temp.id);
      setTimeout(() => resumeTimerByServicioId(sid), 200);
    }
  }, [resumeTimerByServicioId]);


  const value = useMemo(() => ({
    timers, startTimer, stopTimer, stopTimerByRoomId, stopTimerByServicioId,
    pauseTimerByServicioId, resumeTimerByServicioId, getTimerByRoomId, getTimerByServicioId,
    getTemporaryTimerByServicioId,
    formatTime: (seconds: number) => {
      const absSecs = Math.max(0, Math.abs(seconds));
      const m = Math.floor(absSecs / 60);
      const s = absSecs % 60;
      return `${seconds < 0 ? "-" : ""}${m}:${s.toString().padStart(2, "0")}`;
    },
    serverOffset, getAccurateNow,
    setRefreshCallback,
    updateTimerByServicioId,
    startTemporaryTimer, stopTemporaryTimer,
    isInitialized
  }), [timers, startTimer, stopTimer, stopTimerByRoomId, stopTimerByServicioId, pauseTimerByServicioId, resumeTimerByServicioId, serverOffset, getAccurateNow, updateTimerByServicioId, startTemporaryTimer, stopTemporaryTimer, isInitialized]);

  // Debug: mostrar cuando se inicializa
  useEffect(() => {
    console.log('[TimerContext] isInitialized:', isInitialized, 'timers count:', timers.length);
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
