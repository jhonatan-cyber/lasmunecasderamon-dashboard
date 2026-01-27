'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

interface ServiceTimerConfig {
  servicioId: number;
  initialTime: number; // en segundos
  onExpire?: () => void;
  autoStart?: boolean;
}

interface TemporaryTimerConfig {
  duration: number; // en minutos
  onComplete: () => void;
}

interface TemporaryTimerInQueue {
  id: string;
  duration: number; // en segundos
  onComplete: () => void;
}

interface TimerState {
  servicioId: number;
  startTime: number; // timestamp
  duration: number; // segundos totales
  isPaused: boolean;
  
  // Cola de temporizadores temporales
  temporaryQueue: TemporaryTimerInQueue[];
  currentTemporary?: {
    id: string;
    startTime: number;
    duration: number; // en segundos
  };
  
  pausedAt?: number; // timestamp cuando se pausó
  remainingTimeWhenPaused?: number; // tiempo restante cuando se pausó
}

export function useServiceTimer({ servicioId, initialTime, onExpire, autoStart = true }: ServiceTimerConfig) {
  const [timerState, setTimerState] = useState<TimerState>({
    servicioId,
    startTime: Date.now(),
    duration: initialTime,
    isPaused: !autoStart,
    temporaryQueue: []
  });
  
  const [currentTime, setCurrentTime] = useState(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const temporaryCallbacksRef = useRef<Map<string, () => void>>(new Map());
  const expiredRef = useRef(false);

  // Cargar estado desde localStorage
  useEffect(() => {
    const storageKey = `timer_${servicioId}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      try {
        const parsedState: TimerState = JSON.parse(stored);
        setTimerState(parsedState);
      } catch (error) {
        console.error('Error loading timer state:', error);
      }
    }
  }, [servicioId]);

  // Guardar estado en localStorage
  const saveTimerState = useCallback((state: TimerState) => {
    const storageKey = `timer_${servicioId}`;
    localStorage.setItem(storageKey, JSON.stringify(state));
    setTimerState(state);
  }, [servicioId]);

  // Calcular tiempo restante del timer principal
  const calculateRemainingTime = useCallback((state: TimerState, now: number) => {
    if (state.isPaused && state.remainingTimeWhenPaused !== undefined) {
      return Math.max(0, state.remainingTimeWhenPaused);
    }
    
    if (state.isPaused) {
      return Math.max(0, state.duration);
    }

    const elapsed = Math.floor((now - state.startTime) / 1000);
    return Math.max(0, state.duration - elapsed);
  }, []);

  // Calcular tiempo restante del timer temporal actual
  const calculateTemporaryRemainingTime = useCallback((state: TimerState, now: number) => {
    if (!state.currentTemporary) {
      return 0;
    }

    const elapsed = Math.floor((now - state.currentTemporary.startTime) / 1000);
    return Math.max(0, state.currentTemporary.duration - elapsed);
  }, []);

  // Iniciar el siguiente temporizador temporal de la cola
  const startNextTemporaryTimer = useCallback((state: TimerState, now: number): TimerState | null => {
    if (state.temporaryQueue.length === 0) {
      return null;
    }

    const nextTemporary = state.temporaryQueue[0];
    const remainingQueue = state.temporaryQueue.slice(1);

    const newState: TimerState = {
      ...state,
      temporaryQueue: remainingQueue,
      currentTemporary: {
        id: nextTemporary.id,
        startTime: now,
        duration: nextTemporary.duration
      }
    };

    toast.info(`⏱️ Timer temporal ${remainingQueue.length > 0 ? `(${remainingQueue.length + 1} en cola)` : ''}: ${Math.ceil(nextTemporary.duration / 60)} min`);
    
    return newState;
  }, []);

  // Efecto para el intervalo del timer
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      setCurrentTime(now);

      const mainRemaining = calculateRemainingTime(timerState, now);
      const tempRemaining = calculateTemporaryRemainingTime(timerState, now);

      // Si hay un timer temporal activo pero el principal no está pausado, pausarlo automáticamente
      if (timerState.currentTemporary && !timerState.isPaused) {
        const newState: TimerState = {
          ...timerState,
          isPaused: true,
          pausedAt: now,
          remainingTimeWhenPaused: mainRemaining
        };
        
        saveTimerState(newState);
        toast.info('⏸️ Timer principal pausado automáticamente - Timer temporal activo');
        return;
      }

      // Verificar si el timer temporal actual terminó
      if (timerState.currentTemporary && tempRemaining <= 0) {
        const currentTempId = timerState.currentTemporary.id;
        
        // Ejecutar callback del temporizador que acaba de terminar
        const callback = temporaryCallbacksRef.current.get(currentTempId);
        if (callback) {
          callback();
          temporaryCallbacksRef.current.delete(currentTempId);
        }

        // Verificar si hay más temporizadores en la cola
        if (timerState.temporaryQueue.length > 0) {
          // Iniciar el siguiente temporizador temporal
          const newStateWithNext = startNextTemporaryTimer(timerState, now);
          if (newStateWithNext) {
            saveTimerState(newStateWithNext);
            toast.success(`✅ Timer temporal completado. Iniciando siguiente... (${timerState.temporaryQueue.length} restantes)`);
          }
        } else {
          // No hay más temporizadores temporales, reanudar el principal
          const newState: TimerState = {
            ...timerState,
            currentTemporary: undefined,
            isPaused: false,
            startTime: now,
            duration: timerState.remainingTimeWhenPaused || mainRemaining,
            pausedAt: undefined,
            remainingTimeWhenPaused: undefined
          };

          saveTimerState(newState);
          toast.success('⏰ Timer temporal completado. Timer principal reanudado automáticamente.');
        }
        return;
      }

      // Verificar si el timer principal terminó (solo si no hay timer temporal)
      if (!timerState.currentTemporary && !timerState.isPaused && mainRemaining <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        
        if (onExpire) {
          onExpire();
        }
        
        toast.success(`⏰ Tiempo terminado para servicio ${servicioId}`);
        
        // Limpiar del localStorage
        localStorage.removeItem(`timer_${servicioId}`);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState, calculateRemainingTime, calculateTemporaryRemainingTime, onExpire, servicioId, saveTimerState, startNextTemporaryTimer]);

  // Función para agregar un timer temporal a la cola
  const startTemporaryTimer = useCallback((config: TemporaryTimerConfig) => {
    const now = Date.now();
    const tempId = `temp_${now}_${Math.random().toString(36).substr(2, 9)}`;
    const durationInSeconds = config.duration * 60;

    // Guardar el callback
    temporaryCallbacksRef.current.set(tempId, config.onComplete);

    const newTemporary: TemporaryTimerInQueue = {
      id: tempId,
      duration: durationInSeconds,
      onComplete: config.onComplete
    };

    // Si ya hay un temporizador temporal activo, agregar a la cola
    if (timerState.currentTemporary) {
      const newState: TimerState = {
        ...timerState,
        temporaryQueue: [...timerState.temporaryQueue, newTemporary]
      };

      saveTimerState(newState);
      toast.info(`⏱️ Timer temporal agregado a la cola. Posición: ${timerState.temporaryQueue.length + 2}`);
    } else {
      // No hay temporizador temporal activo, pausar el principal e iniciar este
      const currentMainRemaining = calculateRemainingTime(timerState, now);

      const newState: TimerState = {
        ...timerState,
        isPaused: true,
        pausedAt: now,
        remainingTimeWhenPaused: currentMainRemaining,
        currentTemporary: {
          id: tempId,
          startTime: now,
          duration: durationInSeconds
        }
      };

      saveTimerState(newState);
      toast.info(`⏱️ Timer temporal iniciado: ${config.duration} minutos`);
    }
  }, [timerState, calculateRemainingTime, saveTimerState]);

  // Función para pausar manualmente el timer principal
  const pauseMainTimer = useCallback(() => {
    if (!timerState.currentTemporary && !timerState.isPaused) {
      const now = Date.now();
      const currentRemaining = calculateRemainingTime(timerState, now);

      const newState: TimerState = {
        ...timerState,
        isPaused: true,
        pausedAt: now,
        remainingTimeWhenPaused: currentRemaining
      };

      saveTimerState(newState);
      toast.info('⏸️ Timer principal pausado manualmente');
    }
  }, [timerState, calculateRemainingTime, saveTimerState]);

  // Función para reanudar manualmente el timer principal
  const resumeMainTimer = useCallback(() => {
    if (!timerState.currentTemporary && timerState.isPaused) {
      const now = Date.now();
      const remainingTime = timerState.remainingTimeWhenPaused || timerState.duration;

      const newState: TimerState = {
        ...timerState,
        isPaused: false,
        startTime: now,
        duration: remainingTime,
        pausedAt: undefined,
        remainingTimeWhenPaused: undefined
      };

      saveTimerState(newState);
      toast.success('▶️ Timer principal reanudado manualmente');
    }
  }, [timerState, saveTimerState]);

  // Función para formatear tiempo
  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Calcular valores actuales
  const mainRemainingTime = calculateRemainingTime(timerState, currentTime);
  const tempRemainingTime = calculateTemporaryRemainingTime(timerState, currentTime);

  // Timer principal
  const mainTimer = {
    totalSeconds: mainRemainingTime,
    isPaused: timerState.isPaused || !!timerState.currentTemporary,
    isActive: !timerState.isPaused && !timerState.currentTemporary && mainRemainingTime > 0,
    isRunning: !timerState.isPaused && !timerState.currentTemporary && mainRemainingTime > 0
  };

  // Timer temporal
  const temporaryTimer = timerState.currentTemporary ? {
    totalSeconds: tempRemainingTime,
    isPaused: false,
    isActive: true,
    isRunning: true,
    queueLength: timerState.temporaryQueue.length
  } : null;

  // Timer para mostrar
  const displayTimer = timerState.currentTemporary ? {
    totalSeconds: tempRemainingTime,
    isPaused: false,
    isActive: true,
    isRunning: true,
    isTemporary: true,
    startTime: new Date(timerState.currentTemporary.startTime),
    queueLength: timerState.temporaryQueue.length
  } : {
    totalSeconds: mainRemainingTime,
    isPaused: timerState.isPaused || !!timerState.currentTemporary,
    isActive: mainTimer.isActive,
    isRunning: mainTimer.isRunning,
    isTemporary: false,
    startTime: new Date(timerState.startTime),
    queueLength: 0
  };

  return {
    // Timer principal
    mainTimer,
    
    // Timer temporal
    temporaryTimer,
    isTemporaryActive: !!timerState.currentTemporary,
    temporaryQueueLength: timerState.temporaryQueue.length,
    
    // Timer para mostrar (temporal si está activo, sino principal)
    displayTimer,
    
    // Funciones de control
    pauseMainTimer,
    resumeMainTimer,
    startTemporaryTimer,
    
    // Utilidades
    formatTime,
    
    // Estados
    isPaused: timerState.isPaused || !!timerState.currentTemporary,
    servicioId
  };
}