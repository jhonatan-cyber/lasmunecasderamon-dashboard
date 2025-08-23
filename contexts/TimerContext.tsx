'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useConfirmModal } from '@/hooks/useConfirmModal';

interface Timer {
  id: string;
  servicioId: number;
  roomId: number;
  roomName: string;
  duration: number; // en minutos
  remainingTime: number; // en segundos
  isActive: boolean;
  isPaused: boolean; // nuevo campo para pausar
  startTime: Date;
  servicioCode: string;
  clienteNombre: string;
}

interface TimerContextType {
  timers: Timer[];
  startTimer: (
    servicioId: number,
    roomId: number,
    roomName: string,
    duration: number,
    servicioCode: string,
    clienteNombre: string
  ) => void;
  stopTimer: (timerId: string, isManualStop?: boolean) => void;
  stopTimerByRoomId: (roomId: number) => void;
  stopTimerByServicioId: (servicioId: number) => void;
  pauseTimerByServicioId: (servicioId: number) => void;
  resumeTimerByServicioId: (servicioId: number) => void;
  getTimerByRoomId: (roomId: number) => Timer | undefined;
  getTimerByServicioId: (servicioId: number) => Timer | undefined;
  formatTime: (seconds: number) => string;
  setRefreshCallback: (callback: () => void) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

// Función para guardar timers en localStorage
const saveTimersToStorage = (timers: Timer[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('roomTimers', JSON.stringify(timers));
  }
};

// Función para cargar timers desde localStorage
const loadTimersFromStorage = (): Timer[] => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('roomTimers');
    if (stored) {
      const timers = JSON.parse(stored);
      // Convertir las fechas de string a Date
      return timers.map((timer: any) => ({
        ...timer,
        startTime: new Date(timer.startTime)
      }));
    }
  }
  return [];
};

// Función para calcular el tiempo restante basado en el tiempo de inicio
const calculateRemainingTime = (timer: Timer): number => {
  const now = new Date();
  const elapsedSeconds = Math.floor((now.getTime() - timer.startTime.getTime()) / 1000);
  const remaining = timer.duration * 60 - elapsedSeconds;
  return Math.max(0, remaining);
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer debe ser usado dentro de TimerProvider');
  }
  return context;
};

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [expiredTimers, setExpiredTimers] = useState<Set<string>>(new Set());
  const [refreshCallback, setRefreshCallback] = useState<(() => void) | null>(null);
  const { modalState, showConfirm, closeModal } = useConfirmModal();

  // Cargar timers desde localStorage al inicializar
  useEffect(() => {
    const storedTimers = loadTimersFromStorage();

    // Recalcular tiempo restante para cada timer
    const updatedTimers = storedTimers
      .map(timer => {
        const remainingTime = calculateRemainingTime(timer);
        return {
          ...timer,
          remainingTime,
          isActive: remainingTime > 0
        };
      })
      .filter(timer => timer.isActive && timer.remainingTime > 0); // Solo mantener timers activos con tiempo restante

    // Eliminar timers duplicados basándose en roomId y servicioCode
    const uniqueTimers = updatedTimers.filter(
      (timer, index, self) => index === self.findIndex(t => 
        t.roomId === timer.roomId && t.servicioCode === timer.servicioCode
      )
    );

    // Limpiar localStorage de timers duplicados si es necesario
    if (uniqueTimers.length !== storedTimers.length) {
      saveTimersToStorage(uniqueTimers);
    }

    setTimers(uniqueTimers);
    setIsInitialized(true);
  }, []);

  // Guardar timers en localStorage cuando cambien
  useEffect(() => {
    if (isInitialized) {
      // Limpiar timers duplicados antes de guardar
      const uniqueTimers = timers.filter(
        (timer, index, self) => index === self.findIndex(t => 
          t.roomId === timer.roomId && t.servicioCode === timer.servicioCode
        )
      );
      saveTimersToStorage(uniqueTimers);

      // Limpiar timers expirados del tracking set
      const activeTimerIds = new Set(uniqueTimers.map(t => t.id));
      setExpiredTimers(prev => {
        const newSet = new Set([...prev].filter(id => activeTimerIds.has(id)));
        return newSet;
      });
    }
  }, [timers, isInitialized]);

  // Función para actualizar el estado de la habitación
  const updateRoomStatus = useCallback(async (roomId: number, status: number) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: status === 2 ? 'occupy' : 'activate' })
      });

      if (!response.ok) {
        throw new Error('Error al actualizar estado de habitación');
      }

      console.log(`Habitación ${roomId} actualizada a estado ${status}`);
    } catch (error) {
      console.error('Error al actualizar habitación:', error);
      toast.error('Error al actualizar estado de habitación');
    }
  }, []);

  // Función para actualizar el estado del servicio
  const updateServiceStatus = useCallback(async (servicioId: number, status: number) => {
    try {
      const response = await fetch(`/api/servicios/${servicioId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ estado: status })
      });

      if (!response.ok) {
        throw new Error('Error al actualizar estado del servicio');
      }

      console.log(`Servicio ${servicioId} actualizado a estado ${status}`);
    } catch (error) {
      console.error('Error al actualizar servicio:', error);
      toast.error('Error al actualizar estado del servicio');
    }
  }, []);

  // Función para iniciar un temporizador
  const startTimer = useCallback(
    (
      servicioId: number,
      roomId: number,
      roomName: string,
      duration: number,
      servicioCode: string,
      clienteNombre: string
    ) => {
      console.log('🔍 startTimer llamado con parámetros:', {
        servicioId,
        roomId,
        roomName,
        duration,
        servicioCode,
        clienteNombre
      });

      // Verificar si ya existe un timer para esta habitación y servicio específico
      const existingTimer = timers.find(timer => 
        timer.roomId === roomId && timer.servicioCode === servicioCode
      );
      if (existingTimer) {
        // Si ya existe, no crear uno nuevo
        console.log(`Timer ya existe para habitación ${roomId} y servicio ${servicioCode}, no se creará uno nuevo`);
        return;
      }

      // Verificar que los parámetros sean válidos
      if (
        servicioId === undefined ||
        servicioId === null ||
        roomId === undefined ||
        roomId === null ||
        !duration ||
        duration <= 0
      ) {
        console.error('Parámetros inválidos para iniciar timer:', {
          servicioId,
          roomId,
          duration,
          roomName,
          servicioCode,
          clienteNombre
        });
        return;
      }

      const timerId = `timer_${roomId}_${servicioCode}_${Date.now()}`;
      const newTimer: Timer = {
        id: timerId,
        servicioId,
        roomId,
        roomName,
        duration,
        remainingTime: duration * 60, // convertir minutos a segundos
        isActive: true,
        isPaused: false,
        startTime: new Date(),
        servicioCode,
        clienteNombre
      };

      setTimers(prev => {
        // Verificar que no haya duplicados antes de agregar
        const existingTimer = prev.find(t => 
          t.roomId === roomId && t.servicioCode === servicioCode
        );
        if (existingTimer) {
          console.log(`Timer duplicado detectado para habitación ${roomId} y código ${servicioCode}`);
          return prev; // No agregar si ya existe
        }
        console.log(`Agregando nuevo timer para habitación ${roomId} y código ${servicioCode}`);
        const newTimers = [...prev, newTimer];
        return newTimers;
      });

      // Actualizar estado de habitación a ocupada (estado 2)
      updateRoomStatus(roomId, 2);

      toast.success(`Temporizador iniciado para ${roomName} - ${duration} minutos`);
    },
    [timers, updateRoomStatus]
  );

  // Función para detener un temporizador
  const stopTimer = useCallback(
    async (timerId: string, isManualStop: boolean = false) => {
      const timer = timers.find(t => t.id === timerId);
      if (timer) {
        // Actualizar estado del servicio a 0 (finalizado)
        await updateServiceStatus(timer.servicioId, 0);

        // Solo mostrar el modal "Tiempo Terminado" si NO es una parada manual
        if (!isManualStop) {
          // Mostrar notificación con modal personalizado
          const confirmed = await showConfirm({
            title: '⏰ Tiempo Terminado',
            message: `El tiempo de la habitación ${timer.roomName} ha terminado`,
            type: 'info',
            confirmText: 'Entendido',
            cancelText: 'Cerrar',
            size: 'md'
          });

          if (confirmed) {
            // Actualizar estado de habitación a disponible (estado 1)
            await updateRoomStatus(timer.roomId, 1);

            // Mostrar toast de confirmación
            toast.success(`Habitación ${timer.roomName} liberada`);
            
            // Ejecutar callback de actualización si existe
            if (refreshCallback) {
              refreshCallback();
            }
          }
        } else {
          // Si es una parada manual, solo actualizar el estado de la habitación y mostrar toast
          await updateRoomStatus(timer.roomId, 1);
          toast.success(`Habitación ${timer.roomName} liberada manualmente`);
          
          // Ejecutar callback de actualización si existe
          if (refreshCallback) {
            refreshCallback();
          }
        }
      }

      setTimers(prev => prev.filter(t => t.id !== timerId));
    },
    [timers, updateRoomStatus, updateServiceStatus, showConfirm, refreshCallback]
  );

  // Función para detener el temporizador por ID de habitación
  const stopTimerByRoomId = useCallback(
    async (roomId: number) => {
      const timerToStop = timers.find(timer => timer.roomId === roomId);
      if (timerToStop) {
        await stopTimer(timerToStop.id);
        toast.success(`Temporizador para ${timerToStop.roomName} detenido.`);
      } else {
        toast.error(`No se encontró un temporizador activo para la habitación ${roomId}.`);
      }
    },
    [timers, stopTimer]
  );

  // Función para detener el temporizador por ID de servicio
  const stopTimerByServicioId = useCallback(
    async (servicioId: number) => {
      const timerToStop = timers.find(timer => timer.servicioId === servicioId);
      if (timerToStop) {
        await stopTimer(timerToStop.id);
        toast.success(`Temporizador para servicio ${timerToStop.servicioCode} detenido.`);
      } else {
        toast.error(`No se encontró un temporizador activo para el servicio ${servicioId}.`);
      }
    },
    [timers, stopTimer]
  );

  // Función para pausar el temporizador por ID de servicio
           const pauseTimerByServicioId = useCallback(
           (servicioId: number) => {
             console.log(`🚨 PAUSE REQUEST: Pausando temporizador para servicio ${servicioId}`);
             console.log(`📊 Timers antes de pausar:`, timers.filter(t => t.servicioId === servicioId));
             

             
             setTimers(prev => {
               console.log(`🔄 setTimers ejecutándose para servicio ${servicioId}`);
               console.log(`📊 Estado previo:`, prev.filter(t => t.servicioId === servicioId));
               
               const updatedTimers = prev.map(timer => {
                 if (timer.servicioId === servicioId) {
                   console.log(`🎯 Actualizando timer ${servicioId}: isPaused de ${timer.isPaused} a true`);
                   return { ...timer, isPaused: true };
                 }
                 return timer;
               });
               
               console.log(`📊 Timers después de actualizar:`, updatedTimers.filter(t => t.servicioId === servicioId));
               return updatedTimers;
             });
           },
           [timers]
         );

  // Función para reanudar el temporizador por ID de servicio
  const resumeTimerByServicioId = useCallback(
    (servicioId: number) => {
      setTimers(prev => prev.map(timer => 
        timer.servicioId === servicioId 
          ? { ...timer, isPaused: false }
          : timer
      ));
      console.log(`Temporizador reanudado para servicio ${servicioId}`);
    },
    []
  );

  // Función para obtener temporizador por ID de habitación
  const getTimerByRoomId = useCallback(
    (roomId: number) => {
      return timers.find(timer => timer.roomId === roomId);
    },
    [timers]
  );

  // Función para obtener temporizador por ID de servicio
  const getTimerByServicioId = useCallback(
    (servicioId: number) => {
      return timers.find(timer => timer.servicioId === servicioId);
    },
    [timers]
  );

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

  // Efecto para manejar el conteo regresivo
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(() => {
      setTimers(prev => {
        // Limpiar timers duplicados primero
        const uniqueTimers = prev.filter(
          (timer, index, self) => index === self.findIndex(t => 
            t.roomId === timer.roomId && t.servicioCode === timer.servicioCode
          )
        );

                       const updatedTimers = uniqueTimers.map(timer => {
                 // Skip processing if timer is already stopped, expired, or paused
                 if (!timer.isActive || timer.remainingTime <= 0 || timer.isPaused) {
                   // if (timer.isPaused) {
                   //   console.log(`⏸️ Timer pausado ${timer.servicioCode} - no procesando`);
                   // }
                   return timer;
                 }

          const newRemainingTime = timer.remainingTime - 1;

          // Si el temporizador llegó a cero
          if (newRemainingTime <= 0) {
            // Verificar si ya se mostró la notificación para este timer
            if (expiredTimers.has(timer.id)) {
              return { ...timer, isActive: false, remainingTime: 0 };
            }

            // Marcar este timer como expirado para evitar notificaciones duplicadas
            setExpiredTimers(prev => new Set([...prev, timer.id]));

            // Detener el timer inmediatamente y marcar como completado
            const stoppedTimer = {
              ...timer,
              isActive: false,
              remainingTime: 0
            };

            // Usar la función stopTimer para manejar la terminación automática
            // Esto evitará duplicación de modales
            setTimeout(() => {
              stopTimer(timer.id, false); // false = terminación automática
            }, 0);

            return stoppedTimer;
          }

          return { ...timer, remainingTime: newRemainingTime };
        });

        // Remover temporizadores inactivos y expirados inmediatamente
        const activeTimers = updatedTimers.filter(
          timer => timer.isActive && timer.remainingTime > 0
        );

        // Limpiar localStorage de timers expirados inmediatamente
        if (activeTimers.length !== updatedTimers.length) {
          console.log('Eliminando timers expirados:', updatedTimers.length - activeTimers.length);
          saveTimersToStorage(activeTimers);
        }

        return activeTimers;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isInitialized, updateRoomStatus, expiredTimers, stopTimer]);

  const value: TimerContextType = {
    timers,
    startTimer,
    stopTimer,
    stopTimerByRoomId,
    stopTimerByServicioId,
    pauseTimerByServicioId,
    resumeTimerByServicioId,
    getTimerByRoomId,
    getTimerByServicioId,
    formatTime,
    setRefreshCallback
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
      <ConfirmModal
        open={modalState.open}
        onOpenChange={closeModal}
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        type={modalState.type}
        onConfirm={modalState.onConfirm || (() => {})}
        onCancel={modalState.onCancel}
        confirmVariant={modalState.confirmVariant}
        cancelVariant={modalState.cancelVariant}
        size={modalState.size}
      />
    </TimerContext.Provider>
  );
};
