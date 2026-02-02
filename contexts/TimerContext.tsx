'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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
  isTemporary?: boolean; // nuevo campo para identificar timers temporales
  onComplete?: () => void; // callback para cuando termine el timer temporal
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
  getTemporaryTimerByServicioId: (servicioId: number) => Timer | undefined;
  formatTime: (seconds: number) => string;
  setRefreshCallback: (callback: (servicioId?: number) => void) => void;
  updateTimerByServicioId: (servicioId: number, newDuration: number) => void;
  startTemporaryTimer: (
    servicioId: number,
    roomId: number,
    roomName: string,
    duration: number,
    servicioCode: string,
    clienteNombre: string,
    onComplete: () => void
  ) => void;
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
  const totalDurationSeconds = timer.duration * 60;
  const remaining = totalDurationSeconds - elapsedSeconds;

  // Si el timer estaba pausado, mantener el tiempo restante que tenía
  if (timer.isPaused) {
    return timer.remainingTime;
  }

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
  const [refreshCallback, setRefreshCallback] = useState<((servicioId?: number) => void) | null>(null);
  const { modalState, showConfirm, closeModal } = useConfirmModal();

  // Refs para evitar clausuras obsoletas en el intervalo y callbacks
  const timersRef = React.useRef<Timer[]>([]);
  const refreshCallbackRef = React.useRef<((servicioId?: number) => void) | null>(null);

  // Actualizar refs cuando cambien los estados
  useEffect(() => {
    timersRef.current = timers;
  }, [timers]);

  useEffect(() => {
    refreshCallbackRef.current = refreshCallback;
  }, [refreshCallback]);

  // Cargar timers desde localStorage al inicializar
  useEffect(() => {
    const storedTimers = loadTimersFromStorage();

    if (storedTimers.length > 0) {
      console.log('🔄 Restaurando temporizadores desde localStorage:', storedTimers.length);
    }

    // Recalcular tiempo restante para cada timer
    const updatedTimers = storedTimers
      .map(timer => {
        const remainingTime = calculateRemainingTime(timer);
        const isStillActive = remainingTime > 0;

        console.log(`⏱️ Timer ${timer.servicioCode}: ${Math.floor(remainingTime / 60)}:${(remainingTime % 60).toString().padStart(2, '0')} restante`);

        return {
          ...timer,
          remainingTime,
          isActive: isStillActive
        };
      })
      .filter(timer => timer.isActive && timer.remainingTime > 0); // Solo mantener timers activos con tiempo restante

    // Eliminar timers duplicados basándose en roomId y servicioCode
    const uniqueTimers = updatedTimers.filter(
      (timer, index, self) =>
        index ===
        self.findIndex(t => t.roomId === timer.roomId && t.servicioCode === timer.servicioCode)
    );

    // Sincronizar con el estado de los servicios en la base de datos
    const syncWithDatabase = async () => {
      if (uniqueTimers.length === 0) {
        setTimers([]);
        setIsInitialized(true);
        return;
      }

      try {
        // Obtener servicios activos de la base de datos
        const response = await fetch('/api/servicios?all=false');
        const data = await response.json();

        if (data.success) {
          const activeServices = new Set(data.data.map((s: any) => s.id_servicio));

          // Filtrar timers que corresponden a servicios que aún están activos
          const validTimers = uniqueTimers.filter(timer =>
            activeServices.has(timer.servicioId)
          );

          if (validTimers.length !== uniqueTimers.length) {
            console.log(`🧹 Limpiando ${uniqueTimers.length - validTimers.length} temporizadores de servicios finalizados`);
            saveTimersToStorage(validTimers);
          }

          if (validTimers.length > 0) {
            console.log('✅ Temporizadores restaurados exitosamente:', validTimers.length);
          }

          setTimers(validTimers);
        } else {
          // Si hay error al obtener servicios, usar los timers locales
          setTimers(uniqueTimers);
        }
      } catch (error) {
        console.error('Error al sincronizar temporizadores:', error);
        // En caso de error, usar los timers locales
        setTimers(uniqueTimers);
      } finally {
        setIsInitialized(true);
      }
    };

    syncWithDatabase();
  }, []);

  // Guardar timers en localStorage cuando cambien
  useEffect(() => {
    if (isInitialized) {
      // Limpiar timers duplicados antes de guardar
      const uniqueTimers = timers.filter(
        (timer, index, self) =>
          index ===
          self.findIndex(t => t.roomId === timer.roomId && t.servicioCode === timer.servicioCode)
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
    } catch (error) {
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
    } catch (error) {
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
      // Verificar si ya existe un timer para esta habitación y servicio específico
      const existingTimer = timers.find(
        timer => timer.roomId === roomId && timer.servicioCode === servicioCode
      );
      if (existingTimer) {
        // Si ya existe, no crear uno nuevo

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
        const existingTimer = prev.find(
          t => t.roomId === roomId && t.servicioCode === servicioCode
        );
        if (existingTimer) {
          return prev; // No agregar si ya existe
        }

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
    async (timerId: string, isManualStop: boolean = false, timerObject?: Timer) => {
      // Usar el objeto proporcionado o buscar en el ref para tener la versión más reciente
      const timer = timerObject || timersRef.current.find(t => t.id === timerId);

      if (timer) {
        console.log(`🛑 Deteniendo timer: ${timer.id} (${timer.roomName}), manual: ${isManualStop}`);

        // Ejecutar ambas actualizaciones en paralelo para mayor confiabilidad
        await Promise.all([
          updateServiceStatus(timer.servicioId, 0),
          updateRoomStatus(timer.roomId, 1)
        ]);

        // Ejecutar callback de actualización después de que se actualice la DB
        setTimeout(() => {
          if (refreshCallbackRef.current) {
            console.log('🔄 Ejecutando refreshCallback para servicio:', timer.servicioId);
            refreshCallbackRef.current(timer.servicioId);
          } else {
            console.log('⚠️ No hay refreshCallback configurado en el ref');
          }
        }, 1000); // Dar tiempo para que la DB se actualice

        // Solo mostrar toast si es una parada manual
        if (isManualStop) {
          toast.success(`Habitación ${timer.roomName} liberada manualmente`);
        }
      } else {
        console.warn(`⚠️ No se encontró el timer ${timerId} para detenerlo`);
      }

      setTimers(prev => prev.filter(t => t.id !== timerId));
    },
    [updateRoomStatus, updateServiceStatus]
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

  // Función para pausar el temporizador por ID de servicio (solo timers principales)
  const pauseTimerByServicioId = useCallback(
    (servicioId: number) => {
      setTimers(prev => {
        const updatedTimers = prev.map(timer => {
          // Solo pausar timers principales (no temporales) del servicio especificado
          if (timer.servicioId === servicioId && !timer.isTemporary) {
            return { ...timer, isPaused: true };
          }
          return timer;
        });

        return updatedTimers;
      });
    },
    []
  );

  // Función para reanudar el temporizador por ID de servicio (solo timers principales)
  const resumeTimerByServicioId = useCallback((servicioId: number) => {
    setTimers(prev =>
      prev.map(timer =>
        // Solo reanudar timers principales (no temporales) del servicio especificado
        (timer.servicioId === servicioId && !timer.isTemporary) ?
          { ...timer, isPaused: false } :
          timer
      )
    );
  }, []);

  // Función para obtener temporizador por ID de habitación
  const getTimerByRoomId = useCallback(
    (roomId: number) => {
      return timers.find(timer => timer.roomId === roomId);
    },
    [timers]
  );

  // Función para obtener temporizador por ID de servicio (solo timers principales)
  const getTimerByServicioId = useCallback(
    (servicioId: number) => {
      return timers.find(timer => timer.servicioId === servicioId && !timer.isTemporary);
    },
    [timers]
  );

  // Función para obtener temporizador temporal por ID de servicio
  const getTemporaryTimerByServicioId = useCallback(
    (servicioId: number) => {
      return timers.find(timer => timer.servicioId === servicioId && timer.isTemporary);
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
          (timer, index, self) =>
            index ===
            self.findIndex(t => t.roomId === timer.roomId && t.servicioCode === timer.servicioCode)
        );

        const expiredTimerIds: string[] = [];

        const updatedTimers = uniqueTimers.map(timer => {
          // Skip processing if timer is already stopped, expired, or paused
          if (!timer.isActive || timer.remainingTime <= 0 || timer.isPaused) {
            return timer;
          }

          const newRemainingTime = timer.remainingTime - 1;

          // Si el temporizador llegó a cero
          if (newRemainingTime <= 0) {
            // Verificar si ya se mostró la notificación para este timer
            if (!expiredTimers.has(timer.id)) {
              expiredTimerIds.push(timer.id);
            }

            // Marcar como completado
            return {
              ...timer,
              isActive: false,
              remainingTime: 0
            };
          }

          return { ...timer, remainingTime: newRemainingTime };
        });

        // Procesar timers expirados fuera del render
        if (expiredTimerIds.length > 0) {
          setTimeout(() => {
            // Marcar timers como expirados
            setExpiredTimers(prev => {
              const newSet = new Set(prev);
              expiredTimerIds.forEach(id => newSet.add(id));
              return newSet;
            });

            // Procesar cada timer expirado
            expiredTimerIds.forEach(timerId => {
              const timer = updatedTimers.find(t => t.id === timerId);
              if (timer) {
                if (timer.isTemporary) {
                  // Si es un timer temporal, ejecutar su callback y reanudar el timer principal
                  if (timer.onComplete) {
                    timer.onComplete();
                  }
                  // Reanudar el timer principal
                  setTimeout(() => {
                    resumeTimerByServicioId(timer.servicioId);
                    // Quitar el toast para no interrumpir al usuario
                  }, 200);
                } else {
                  // Timer normal, procesar como antes
                  // Pasamos el objeto timer para evitar problemas de búsqueda en el ref si ya se filtró
                  stopTimer(timerId, false, timer); // false = terminación automática
                }
              }
            });
          }, 100); // Pequeño delay para evitar conflictos de render
        }

        // Remover temporizadores inactivos y expirados
        const activeTimers = updatedTimers.filter(
          timer => timer.isActive && timer.remainingTime > 0
        );

        // Limpiar localStorage de timers expirados
        if (activeTimers.length !== updatedTimers.length) {
          setTimeout(() => {
            saveTimersToStorage(activeTimers);
          }, 0);
        }

        return activeTimers;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isInitialized, expiredTimers, resumeTimerByServicioId, stopTimer]);

  // Función para actualizar un temporizador existente
  const updateTimerByServicioId = useCallback(
    (servicioId: number, newDuration: number) => {
      setTimers(prev => {
        return prev.map(timer => {
          if (timer.servicioId === servicioId) {
            // Recalcular tiempo restante basado en la nueva duración
            const now = new Date();
            const elapsedSeconds = Math.floor((now.getTime() - timer.startTime.getTime()) / 1000);
            const remaining = newDuration * 60 - elapsedSeconds;

            return {
              ...timer,
              duration: newDuration,
              remainingTime: Math.max(0, remaining)
            };
          }
          return timer;
        });
      });

      toast.info(`Tiempo del servicio actualizado a ${newDuration} minutos`);
    },
    []
  );

  // Función para iniciar un temporizador temporal que pausa el principal
  const startTemporaryTimer = useCallback(
    (
      servicioId: number,
      roomId: number,
      roomName: string,
      duration: number,
      servicioCode: string,
      clienteNombre: string,
      onComplete: () => void
    ) => {
      // Primero pausar el timer principal
      pauseTimerByServicioId(servicioId);

      // Debug: verificar que el timer principal se pausó
      setTimeout(() => {
        setTimers(prev => {
          const mainTimer = prev.find(t => t.servicioId === servicioId && !t.isTemporary);
          if (mainTimer) {
            console.log('Timer principal después de pausar:', {
              id: mainTimer.id,
              isPaused: mainTimer.isPaused,
              remainingTime: mainTimer.remainingTime
            });
            if (!mainTimer.isPaused) {
              toast.warning('⚠️ El timer principal no se pausó correctamente');
            } else {
              toast.info('⏸️ Timer principal pausado correctamente');
            }
          }
          return prev;
        });
      }, 100);

      // Crear un timer temporal con un ID único
      const temporaryTimerId = `temp_timer_${servicioId}_${Date.now()}`;
      const temporaryTimer: Timer = {
        id: temporaryTimerId,
        servicioId,
        roomId,
        roomName,
        duration,
        remainingTime: duration * 60, // convertir minutos a segundos
        isActive: true,
        isPaused: false,
        startTime: new Date(),
        servicioCode: `${servicioCode}-TEMP`,
        clienteNombre,
        isTemporary: true,
        onComplete
      };

      setTimers(prev => [...prev, temporaryTimer]);
      toast.info(`⏱️ Timer temporal iniciado: ${duration} minutos`);
    },
    [pauseTimerByServicioId]
  );

  const value: TimerContextType = useMemo(() => ({
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
    setRefreshCallback,
    updateTimerByServicioId,
    startTemporaryTimer
  }), [
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
    setRefreshCallback,
    updateTimerByServicioId,
    startTemporaryTimer
  ]);

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
        hideCancel={modalState.hideCancel}
        type={modalState.type}
        onConfirm={modalState.onConfirm || (() => { })}
        onCancel={modalState.onCancel}
        confirmVariant={modalState.confirmVariant}
        cancelVariant={modalState.cancelVariant}
        size={modalState.size}
      />
    </TimerContext.Provider>
  );
};
