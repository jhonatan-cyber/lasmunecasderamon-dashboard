'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useConfirmModal } from '@/hooks/shared/useConfirmModal';
import { TimerExpiredModal } from '@/components/notifications';

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
  datosTemporales?: any; // datos temporales para mostrar en el card
  tipoTransaccion?: 'servicio' | 'venta'; // tipo de transacción
  anfitrionas?: string; // nombres de anfitrionas
  waiterName?: string; // nombre del garzón/mesero que lo pidió
}

interface TimerExpiredNotification {
  id: string;
  roomName: string;
  servicioCode: string;
  clienteNombre: string;
  tiempoTotal: number;
  isTemporary: boolean;
  tipoTransaccion: 'servicio' | 'venta';
  anfitrionas: string;
  waiterName?: string;
}

interface TimerContextType {
  timers: Timer[];
  startTimer: (
    servicioId: number,
    roomId: number,
    roomName: string,
    duration: number,
    servicioCode: string,
    clienteNombre: string,
    anfitrionas?: string,
    tipoTransaccion?: 'servicio' | 'venta',
    waiterName?: string
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
    onComplete: () => void,
    datosTemporales?: any,
    anfitrionas?: string
  ) => void;
  stopTemporaryTimer: (servicioId: number) => void;
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
  const [refreshCallback, setRefreshCallback] = useState<((servicioId?: number) => void) | null>(
    null
  );
  const { modalState, showConfirm, closeModal } = useConfirmModal();

  // Estados para notificaciones de timer expirado
  const [timerExpiredNotification, setTimerExpiredNotification] =
    useState<TimerExpiredNotification | null>(null);
  const [showTimerExpiredModal, setShowTimerExpiredModal] = useState(false);

  // Función para mostrar notificación de timer expirado
  const showTimerExpiredNotification = useCallback((timer: Timer) => {
    console.log('🔔 Mostrando notificación de timer expirado:', timer.roomName);

    const notification: TimerExpiredNotification = {
      id: timer.id,
      roomName: timer.roomName,
      servicioCode: timer.servicioCode,
      clienteNombre: timer.clienteNombre,
      tiempoTotal: timer.duration,
      isTemporary: timer.isTemporary || false,
      tipoTransaccion: timer.tipoTransaccion || 'servicio',
      anfitrionas: timer.anfitrionas || '',
      waiterName: timer.waiterName
    };

    setTimerExpiredNotification(notification);
    setShowTimerExpiredModal(true);

    // También reproducir sonido de notificación si está disponible
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log('No se pudo reproducir sonido de notificación:', e));
    } catch (error) {
      console.log('Audio de notificación no disponible');
    }
  }, []);

  // Función para cerrar la notificación
  const closeTimerExpiredNotification = useCallback(() => {
    setShowTimerExpiredModal(false);
    setTimerExpiredNotification(null);
  }, []);

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

        console.log(
          `⏱️ Timer ${timer.servicioCode}: ${Math.floor(remainingTime / 60)}:${(remainingTime % 60).toString().padStart(2, '0')} restante`
        );

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
          const activeServicesMap = new Map(data.data.map((s: any) => [s.id_servicio, s]));

          // Filtrar y enriquecer timers:
          // 1. Si es servicio, verificar que aún esté activo en la DB y enriquecer con datos frescos
          // 2. Si es venta, mantenerlo (por ahora no filtramos ventas por DB en el inicio)
          const validTimers = uniqueTimers
            .filter(timer => {
              if (timer.tipoTransaccion === 'venta') return true;
              return activeServicesMap.has(timer.servicioId);
            })
            .map(timer => {
              if (timer.tipoTransaccion === 'venta') return timer;
              const dbService = activeServicesMap.get(timer.servicioId);
              if (!dbService) return timer;

              // Enriquecer con datos de la DB si faltan en el timer local
              const service = dbService as any;
              return {
                ...timer,
                anfitrionas: timer.anfitrionas || service.anfitrionas_nombres || '',
                clienteNombre: timer.clienteNombre || service.cliente_nombre || '',
                roomName: timer.roomName || service.habitacion_numero || 'S/H'
              };
            });

          if (validTimers.length !== uniqueTimers.length) {
            console.log(
              `🧹 Limpiando ${uniqueTimers.length - validTimers.length} temporizadores de servicios finalizados`
            );
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

  // Cargar timers activos del servidor periódicamente (sincronización multi-dispositivo)
  useEffect(() => {
    if (!isInitialized) return;

    const syncActiveTimers = async () => {
      try {
        const response = await fetch('/api/timers/active');
        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
          const serverTimers = data.data;

          // Por cada timer del servidor, verificar si existe localmente
          serverTimers.forEach((serverTimer: any) => {
            const existsLocally = timersRef.current.some(
              t => t.servicioId === serverTimer.servicioId
            );

            // Si no existe localmente, agregarlo
            if (!existsLocally) {
              console.log('[TimerContext] Sincronizando timer desde servidor:', serverTimer.codigo);

              // Calcular tiempo restante
              const now = new Date();
              const start = new Date(serverTimer.startTime);
              const elapsedSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
              const remainingSeconds = Math.max(0, serverTimer.duration * 60 - elapsedSeconds);

              if (remainingSeconds > 0) {
                const newTimer: Timer = {
                  id: `${serverTimer.servicioId}-${serverTimer.roomId}-${Date.now()}`,
                  servicioId: serverTimer.servicioId,
                  roomId: serverTimer.roomId,
                  roomName: serverTimer.roomName,
                  duration: serverTimer.duration,
                  remainingTime: remainingSeconds,
                  isActive: true,
                  isPaused: false,
                  startTime: start,
                  servicioCode: serverTimer.codigo,
                  clienteNombre: serverTimer.clienteNombre,
                  tipoTransaccion: serverTimer.tipoTransaccion || 'servicio',
                  anfitrionas: serverTimer.anfitrionas || ''
                };

                setTimers(prev => [...prev, newTimer]);
              }
            }
          });

          // Remover timers locales que ya no están activos en el servidor
          const serverTimerIds = new Set(serverTimers.map((t: any) => t.servicioId));
          setTimers(prev => {
            const filtered = prev.filter(timer => {
              // Mantener timers temporales y de ventas
              if (timer.isTemporary || timer.tipoTransaccion === 'venta') return true;
              // Mantener timers de servicios que están en el servidor
              return serverTimerIds.has(timer.servicioId);
            });
            return filtered;
          });
        }
      } catch (error) {
        console.error('[TimerContext] Error sincronizando timers activos:', error);
      }
    };

    // Sincronizar inmediatamente al cargar
    syncActiveTimers();

    // Sincronizar cada 30 segundos
    const interval = setInterval(syncActiveTimers, 30000);

    return () => clearInterval(interval);
  }, [isInitialized]);

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

  // Sincronización de timers via SSE para multi-dispositivo
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectSSE = () => {
      console.log('[TimerContext] Conectando a SSE para sincronización de timers...');
      eventSource = new EventSource('/api/notifications/sse');

      eventSource.addEventListener('message', event => {
        try {
          const payload = JSON.parse(event.data);

          // Evento: Se inició un nuevo timer
          if (payload?.type === 'timer_started' && payload?.data) {
            const {
              servicioId,
              codigo,
              roomId,
              roomName,
              duration,
              startTime,
              clienteNombre,
              anfitrionas,
              tipoTransaccion
            } = payload.data;

            // Verificar si ya existe este timer localmente
            const existingTimer = timersRef.current.find(
              t => t.servicioId === servicioId && t.codigo === codigo
            );

            if (!existingTimer) {
              console.log('[TimerContext] SSE: Iniciando timer remoto:', codigo);

              // Calcular tiempo restante basándose en startTime
              const now = new Date();
              const start = new Date(startTime);
              const elapsedSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
              const remainingSeconds = Math.max(0, duration * 60 - elapsedSeconds);

              const newTimer: Timer = {
                id: `${servicioId}-${roomId}-${Date.now()}`,
                servicioId,
                roomId,
                roomName,
                duration,
                remainingTime: remainingSeconds,
                isActive: true,
                isPaused: false,
                startTime: start,
                servicioCode: codigo,
                clienteNombre,
                tipoTransaccion: tipoTransaccion || 'servicio',
                anfitrionas: anfitrionas || ''
              };

              setTimers(prev => [
                ...prev.filter(t => !(t.servicioId === servicioId && t.roomId === roomId)),
                newTimer
              ]);
              saveTimersToStorage([
                ...timersRef.current.filter(
                  t => !(t.servicioId === servicioId && t.roomId === roomId)
                ),
                newTimer
              ]);
            }
          }

          // Evento: Se detuvo un timer
          if (payload?.type === 'timer_stopped' && payload?.data) {
            const { servicioId, roomId } = payload.data;
            console.log('[TimerContext] SSE: Deteniendo timer remoto:', servicioId);

            setTimers(prev => {
              const updated = prev.filter(t => t.servicioId !== servicioId);
              saveTimersToStorage(updated);
              return updated;
            });
          }
        } catch (error) {
          console.error('[TimerContext] Error procesando evento SSE:', error);
        }
      });

      eventSource.onerror = () => {
        console.log('[TimerContext] SSE desconectado, reintentando...');
        eventSource?.close();
        setTimeout(connectSSE, 3000);
      };
    };

    connectSSE();

    return () => {
      console.log('[TimerContext] Desconectando SSE');
      eventSource?.close();
    };
  }, []);

  // Función para actualizar el estado de la habitación
  const updateRoomStatus = useCallback(async (roomId: number, status: number) => {
    try {
      // Primero obtener los datos de la habitación
      const roomResponse = await fetch(`/api/rooms/${roomId}`);
      if (!roomResponse.ok) {
        throw new Error('Error al obtener datos de habitación');
      }

      const roomData = await roomResponse.json();
      if (!roomData.success) {
        throw new Error('No se pudo obtener datos de habitación');
      }

      const room = roomData.data;

      // Verificar si la habitación tiene precio, tiempo o comisión
      const hasPrice = room.price != null && room.price > 0;
      const hasTime = room.time != null && room.time > 0;
      const hasCommission = room.comision_anfitriona != null && room.comision_anfitriona > 0;

      // Si la habitación NO tiene precio, tiempo ni comisión, no cambiar su estado
      if (!hasPrice && !hasTime && !hasCommission) {
        console.log(`ℹ️ Habitación ${roomId} sin precio/tiempo/comisión - no se cambia el estado`);
        return;
      }

      // Si tiene al menos uno de los valores, actualizar el estado
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
      clienteNombre: string,
      anfitrionas?: string,
      tipoTransaccion: 'servicio' | 'venta' = 'servicio',
      waiterName?: string
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
        clienteNombre,
        tipoTransaccion,
        anfitrionas: anfitrionas || '',
        waiterName
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
        console.log(
          `🛑 Deteniendo timer: ${timer.id} (${timer.roomName}), manual: ${isManualStop}`
        );

        // PRIMERO: Eliminar el timer del estado local inmediatamente para evitar que se vuelva a mostrar
        setTimers(prev => prev.filter(t => t.id !== timerId));

        // Guardar inmediatamente en localStorage para asegurar que el timer se elimine de "roomTimers" sin esperar al efecto
        try {
          const newTimers = timersRef.current.filter(t => t.id !== timerId);
          saveTimersToStorage(newTimers);
        } catch (e) {
          console.warn('[TimerContext] No se pudo limpiar inmediatamente localStorage:', e);
        }

        // Determinar qué actualizaciones realizar
        const otherTimersInSameRoom = timersRef.current.filter(
          t => t.roomId === timer.roomId && t.id !== timerId && t.isActive
        );

        const updates = [];

        // Actualizar estado según el tipo de transacción
        if (timer.tipoTransaccion === 'servicio') {
          // Para servicios, actualizar el estado del servicio
          updates.push(updateServiceStatus(timer.servicioId, 0));
        } else if (timer.tipoTransaccion === 'venta') {
          // Para ventas, finalizar la venta
          try {
            console.log(`[STOP TIMER] 📡 Finalizando venta ${timer.servicioId} en servidor...`);
            const response = await fetch(`/api/ventas/${timer.servicioId}/stop`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json'
              }
            });

            if (response.ok) {
              const data = await response.json();
              console.log(`✅ Venta ${timer.servicioId} finalizada en servidor:`, data);
            } else {
              console.error(`❌ Error finalizando venta ${timer.servicioId}:`, response.statusText);
            }
          } catch (error) {
            console.error(`❌ Error al finalizar venta:`, error);
          }
        }

        // Liberar la habitación si no hay más temporizadores activos para ella
        if (otherTimersInSameRoom.length === 0) {
          console.log(`🧹 Liberando habitación ${timer.roomId} - no quedan otros timers activos`);
          updates.push(updateRoomStatus(timer.roomId, 1));
        } else {
          console.log(
            `⏳ Habitación ${timer.roomId} sigue ocupada - quedan ${otherTimersInSameRoom.length} timers activos`
          );
        }

        if (updates.length > 0) {
          await Promise.all(updates);
        }

        // Ejecutar callback de actualización después de que se actualice la DB
        setTimeout(() => {
          if (refreshCallbackRef.current) {
            console.log('🔄 Ejecutando refreshCallback para id:', timer.servicioId);
            refreshCallbackRef.current(timer.servicioId);
          }
        }, 1000); // Dar tiempo para que la DB se actualice

        // Solo mostrar toast si es una parada manual
        if (isManualStop) {
          toast.success(`Habitación ${timer.roomName} liberada manualmente`);
        }
      } else {
        console.warn(`⚠️ No se encontró el timer ${timerId} para detenerlo`);
      }
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
        await stopTimer(timerToStop.id, true); // true = es una parada manual
      } else {
        toast.error(`No se encontró un temporizador activo para el servicio ${servicioId}.`);
      }
    },
    [timers, stopTimer]
  );

  // Función para pausar el temporizador por ID de servicio (solo timers principales)
  const pauseTimerByServicioId = useCallback((servicioId: number) => {
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
  }, []);

  // Función para reanudar el temporizador por ID de servicio (solo timers principales)
  const resumeTimerByServicioId = useCallback((servicioId: number) => {
    setTimers(prev =>
      prev.map(timer =>
        // Solo reanudar timers principales (no temporales) del servicio especificado
        timer.servicioId === servicioId && !timer.isTemporary
          ? { ...timer, isPaused: false }
          : timer
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
          // Skip processing if timer is already stopped or expired
          if (!timer.isActive || timer.remainingTime <= 0) {
            return timer;
          }

          // Si es un timer principal (no temporal), verificar si hay un timer temporal activo para el mismo servicio
          if (!timer.isTemporary) {
            const hasActiveTemporaryTimer = uniqueTimers.some(
              t =>
                t.servicioId === timer.servicioId &&
                t.isTemporary &&
                t.isActive &&
                t.remainingTime > 0
            );

            // Si hay un timer temporal activo, pausar el timer principal automáticamente
            if (hasActiveTemporaryTimer && !timer.isPaused) {
              console.log(`⏸️ Auto-pausando timer principal ${timer.id} - timer temporal activo`);
              return { ...timer, isPaused: true };
            }

            // Si no hay timer temporal y estaba pausado por uno, reanudar automáticamente
            if (!hasActiveTemporaryTimer && timer.isPaused) {
              console.log(`▶️ Auto-reanudando timer principal ${timer.id} - no hay timer temporal`);
              return { ...timer, isPaused: false };
            }
          }

          // Skip processing if timer is paused
          if (timer.isPaused) {
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
                // Mostrar notificación modal para cualquier timer que expire
                showTimerExpiredNotification(timer);

                if (timer.isTemporary) {
                  // Si es un timer temporal, ejecutar su callback y reanudar el timer principal
                  console.log(
                    `⏱️ Timer temporal ${timer.id} completado para servicio ${timer.servicioId}`
                  );
                  if (timer.onComplete) {
                    timer.onComplete();
                  }
                  // Reanudar el timer principal después de un pequeño delay
                  setTimeout(() => {
                    resumeTimerByServicioId(timer.servicioId);
                    console.log(
                      `▶️ Timer principal reanudado automáticamente para servicio ${timer.servicioId}`
                    );
                    toast.success('Timer principal reanudado automáticamente');
                  }, 200);
                } else {
                  // Timer normal, procesar como antes
                  console.log(
                    `⏱️ Timer principal ${timer.id} completado para servicio ${timer.servicioId}`
                  );
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
  }, [
    isInitialized,
    expiredTimers,
    resumeTimerByServicioId,
    stopTimer,
    showTimerExpiredNotification
  ]);

  // Función para actualizar un temporizador existente
  const updateTimerByServicioId = useCallback((servicioId: number, newDuration: number) => {
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
  }, []);

  // Función para detener un timer temporal manualmente y reanudar el principal
  const stopTemporaryTimer = useCallback(
    (servicioId: number) => {
      const tempTimer = timers.find(t => t.servicioId === servicioId && t.isTemporary);
      if (tempTimer) {
        console.log(`🛑 Deteniendo timer temporal manualmente para servicio ${servicioId}`);

        // Remover el timer temporal
        setTimers(prev => prev.filter(t => t.id !== tempTimer.id));

        // Reanudar el timer principal
        setTimeout(() => {
          resumeTimerByServicioId(servicioId);
          console.log(
            `▶️ Timer principal reanudado tras detener timer temporal para servicio ${servicioId}`
          );
          toast.success('Timer temporal detenido - Timer principal reanudado');
        }, 200);
      } else {
        toast.error('No se encontró un timer temporal activo para este servicio');
      }
    },
    [timers, resumeTimerByServicioId]
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
      onComplete: () => void,
      datosTemporales?: any, // Nuevo parámetro opcional
      anfitrionas?: string // Nuevo parámetro para anfitrionas
    ) => {
      // Verificar si ya existe un timer temporal para este servicio
      const existingTempTimer = timers.find(t => t.servicioId === servicioId && t.isTemporary);
      if (existingTempTimer) {
        toast.warning('Ya existe un timer temporal activo para este servicio');
        return;
      }

      // Verificar que existe un timer principal para pausar
      const mainTimer = timers.find(t => t.servicioId === servicioId && !t.isTemporary);
      if (!mainTimer) {
        toast.error('No se encontró un timer principal para pausar');
        return;
      }

      console.log(
        `⏸️ Iniciando timer temporal para servicio ${servicioId} - pausando timer principal`
      );

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
        datosTemporales: datosTemporales, // Agregar los datos temporales
        tipoTransaccion: 'servicio', // Los timers temporales son siempre servicios
        anfitrionas: anfitrionas || '', // Agregar anfitrionas
        onComplete: () => {
          console.log(`⏱️ Timer temporal completado para servicio ${servicioId}`);
          // Ejecutar el callback original
          onComplete();
          // El timer principal se reanudará automáticamente en el próximo ciclo del interval
          // ya que no habrá más timers temporales activos para este servicio
        }
      };

      // Agregar el timer temporal y pausar el principal explícitamente
      setTimers(prev => {
        return prev
          .map(timer => {
            // Pausar el timer principal del mismo servicio
            if (timer.servicioId === servicioId && !timer.isTemporary) {
              console.log(`⏸️ Pausando timer principal ${timer.id} por timer temporal`);
              return { ...timer, isPaused: true };
            }
            return timer;
          })
          .concat(temporaryTimer);
      });

      toast.info(
        `⏱️ Timer temporal iniciado: ${duration} minutos (Timer principal pausado automáticamente)`
      );
    },
    [timers]
  );

  const value: TimerContextType = useMemo(
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
      setRefreshCallback,
      updateTimerByServicioId,
      startTemporaryTimer,
      stopTemporaryTimer
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
      formatTime,
      setRefreshCallback,
      updateTimerByServicioId,
      startTemporaryTimer,
      stopTemporaryTimer
    ]
  );

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
        onConfirm={modalState.onConfirm || (() => {})}
        onCancel={modalState.onCancel}
        confirmVariant={modalState.confirmVariant}
        cancelVariant={modalState.cancelVariant}
        size={modalState.size}
      />

      {/* Modal de notificación de timer expirado */}
      {timerExpiredNotification && (
        <TimerExpiredModal
          open={showTimerExpiredModal}
          onOpenChange={closeTimerExpiredNotification}
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
