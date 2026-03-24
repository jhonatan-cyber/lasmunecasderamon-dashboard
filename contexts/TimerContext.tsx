/* eslint-disable */
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useConfirmModal } from '@/hooks/shared/useConfirmModal';
import { useSSE } from '@/hooks/shared/useSSE';
import { TimerExpiredModal } from '@/components/notifications';
import { playNotificationSound, announceVoice } from '@/lib/audioUtils';

import { parseDateSafe, calculateRemainingTime, formatTime } from '@/lib/timeUtils';

export interface Timer {
  id: string;
  servicioId: string;
  roomId: string;
  roomName: string;
  duration: number; // en minutos
  remainingTime: number; // en segundos
  isActive: boolean;
  isPaused: boolean; // nuevo campo para pausar
  pausedByTemp?: boolean; // nuevo campo para saber si fue pausado por timer temporal
  startTime: Date;
  servicioCode: string;
  clienteNombre: string;
  isTemporary?: boolean; // nuevo campo para identificar timers temporales
  onComplete?: () => void; // callback para cuando termine el timer temporal
  datosTemporales?: any; // datos temporales para mostrar en el card
  tipoTransaccion?: 'servicio' | 'venta'; // tipo de transacción
  anfitrionas?: string; // nombres de anfitrionas
  waiterName?: string; // nombre del garzón/mesero que lo pidió
  lastAnnouncedMinute?: number; // minutos en los que se anunció por última vez
}

export interface TimerExpiredNotification {
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
    servicioId: string,
    roomId: string,
    roomName: string,
    duration: number,
    servicioCode: string,
    clienteNombre: string,
    anfitrionas?: string,
    tipoTransaccion?: 'servicio' | 'venta',
    waiterName?: string
  ) => void;
  stopTimer: (timerId: string, isManualStop?: boolean) => void;
  stopTimerByRoomId: (roomId: string) => void;
  stopTimerByServicioId: (servicioId: string) => void;
  pauseTimerByServicioId: (servicioId: string) => void;
  resumeTimerByServicioId: (servicioId: string) => void;
  getTimerByRoomId: (roomId: string) => Timer | undefined;
  getTimerByServicioId: (servicioId: string) => Timer | undefined;
  getTemporaryTimerByServicioId: (servicioId: string) => Timer | undefined;
  formatTime: (seconds: number) => string;
  serverOffset: number; // Diferencia en ms entre servidor y cliente
  getAccurateNow: () => Date;
  setRefreshCallback: (callback: (servicioId?: string) => void) => void;
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
  stopTemporaryTimer: (servicioId: string) => void;
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
        startTime: parseDateSafe(timer.startTime)
      }));
    }
  }
  return [];
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer debe ser usado dentro de TimerProvider');
  }
  return context;
};

let globalSyncCallCount = 0;

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  console.log('[TimerContext] Render. isInitialized:', isInitialized);
  const [expiredTimers, setExpiredTimers] = useState<Set<string>>(new Set());
  const [refreshCallback, setRefreshCallback] = useState<((servicioId?: string) => void) | null>(
    null
  );
  const { modalState, showConfirm, closeModal } = useConfirmModal();

  // Estados para notificaciones de timer expirado
  const [timerExpiredNotification, setTimerExpiredNotification] =
    useState<TimerExpiredNotification | null>(null);
  const [showTimerExpiredModal, setShowTimerExpiredModal] = useState(false);
  const [serverOffset, setServerOffset] = useState(0);

  useEffect(() => {
    console.log('[TimerContext] 🏗️ MOUNTED');
    return () => console.log('[TimerContext] 🧨 UNMOUNTED');
  }, []);

  // Función para obtener la hora exacta del servidor (estimada)
  const getAccurateNow = useCallback(() => {
    return new Date(Date.now() + serverOffset);
  }, [serverOffset]);

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

    // Reproducir sonido de notificación
    playNotificationSound();

    // Anuncio por voz
    announceVoice(`Servicio terminado en ${timer.roomName}`);
  }, []);

  // Función para cerrar la notificación
  const closeTimerExpiredNotification = useCallback(() => {
    setShowTimerExpiredModal(false);
    setTimerExpiredNotification(null);
  }, []);

  // Refs para evitar clausuras obsoletas en el intervalo y callbacks
  const timersRef = React.useRef<Timer[]>([]);
  const initialSyncExecutedRef = React.useRef(false);
  const periodicSyncStartedRef = React.useRef(false);
  const refreshCallbackRef = React.useRef<((servicioId?: string) => void) | null>(null);

  // Actualizar refs cuando cambien los estados
  useEffect(() => {
    timersRef.current = timers;
  }, [timers]);

  useEffect(() => {
    refreshCallbackRef.current = refreshCallback;
  }, [refreshCallback]);

  // Cargar timers desde localStorage al inicializar
  useEffect(() => {
    if (isInitialized) return;
    const storedTimers = loadTimersFromStorage();

    if (storedTimers.length > 0) {
      console.log('🔄 Restaurando temporizadores desde localStorage:', storedTimers.length);
    }

    // Recalcular tiempo restante para cada timer
    const updatedTimers = storedTimers
      .map(timer => {
        const remainingTime = calculateRemainingTime(timer);
        const isStillActive = remainingTime > 0;

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
        globalSyncCallCount++;
        console.log(`[TimerContext] 📡 syncWithDatabase (TOTAL: ${globalSyncCallCount}) calling fetch /api/timers/active?source=web`);
        const response = await fetch('/api/timers/active?source=web');
        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
          // Calcular offset del servidor
          if (data.serverTime) {
            const serverDate = new Date(data.serverTime);
            const localDate = new Date();
            const offset = serverDate.getTime() - localDate.getTime();
            setServerOffset(offset);
          
          }

          const activeTimersMap = new Map(data.data.map((t: any) => [t.servicioId, t]));

          // Filtrar timers:
          // 1. Si es servicio o venta, verificar que aún esté activo en la DB
          const validTimers = uniqueTimers
            .filter(timer => {
              return activeTimersMap.has(timer.servicioId);
            })
            .map(timer => {
              const dbTimer = activeTimersMap.get(timer.servicioId);
              if (!dbTimer) return timer;

              // Enriquecer con datos de la DB si faltan en el timer local
              const dbTimerAny = dbTimer as any;

              // Recalcular el tiempo restante correcto usando la hora del servidor
              const dbStartTime = parseDateSafe(dbTimerAny.startTime);
              const now = new Date(Date.now() + (data.serverTime ? (new Date(data.serverTime).getTime() - Date.now()) : 0));
              const elapsedSeconds = Math.floor((now.getTime() - dbStartTime.getTime()) / 1000);

              const durationMins = Number(dbTimerAny.duration || 0);
              let remainingSeconds = Math.max(0, durationMins * 60 - elapsedSeconds);

              // Si el tiempo es 0 pero el servicio es muy reciente (menos de 2 minutos),
              // es probable que sea un desfase de reloj. Mantener el tiempo total.
              if (remainingSeconds === 0 && durationMins > 0 && elapsedSeconds < 120) {
                remainingSeconds = durationMins * 60;
              }

              return {
                ...timer,
                roomName: timer.roomName || dbTimerAny.roomName || 'S/H',
                clienteNombre: timer.clienteNombre || dbTimerAny.clienteNombre || '',
                anfitrionas: timer.anfitrionas || dbTimerAny.anfitrionas || '',
                isPaused: dbTimerAny.isPaused !== undefined ? dbTimerAny.isPaused : timer.isPaused,
                startTime: dbStartTime,
                remainingTime: remainingSeconds
              };
            });

          if (validTimers.length !== uniqueTimers.length) {
           
            saveTimersToStorage(validTimers);
          }


          setTimers(validTimers);
        } else {
          // Si hay error al obtener servicios, usar los timers locales
          setTimers(uniqueTimers);
        }
      } catch (error) {
       
        setTimers(uniqueTimers);
      } finally {
        setIsInitialized(true);
      }
    };

    // Si es una página pública o no hay usuario, no sincronizar
    const isPublic =
      !window.location.pathname ||
      window.location.pathname === '/' ||
      window.location.pathname === '/landing' ||
      window.location.pathname === '/login';

    if (isPublic || initialSyncExecutedRef.current) {
      if (!isInitialized) setIsInitialized(true);
      return;
    }

    initialSyncExecutedRef.current = true;
    syncWithDatabase();
  }, []); // Run ONLY once on mount

  // Cargar timers activos del servidor periódicamente (sincronización multi-dispositivo)
  useEffect(() => {
    if (!isInitialized) return;

    const syncActiveTimers = async () => {
      try {
        globalSyncCallCount++;
        console.group('[TimerContext] 🔄 syncActiveTimers Call');
        console.log(`TOTAL: ${globalSyncCallCount}`);
        console.trace('Call Stack');
        console.groupEnd();
        const response = await fetch('/api/timers/active?source=web');
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
            
              // Calcular tiempo restante
              const now = new Date(Date.now() + serverOffset);
              const start = parseDateSafe(serverTimer.startTime);
              const elapsedSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);

              const durationMins = Number(serverTimer.duration || 0);
              let remainingSeconds = Math.max(0, durationMins * 60 - elapsedSeconds);

              // Grace period para desfase de reloj
              if (remainingSeconds === 0 && durationMins > 0 && elapsedSeconds < 120) {
                remainingSeconds = durationMins * 60;
              }

              if (remainingSeconds > 0) {
                const newTimer: Timer = {
                  id: `${serverTimer.servicioId}-${serverTimer.roomId}-${Date.now()}`,
                  servicioId: serverTimer.servicioId,
                  roomId: serverTimer.roomId,
                  roomName: serverTimer.roomName,
                  duration: serverTimer.duration,
                  remainingTime: remainingSeconds,
                  isActive: true,
                  isPaused: serverTimer.isPaused === true,
                  startTime: start,
                  servicioCode: serverTimer.codigo,
                  clienteNombre: serverTimer.clienteNombre,
                  tipoTransaccion: serverTimer.tipoTransaccion || 'servicio',
                  anfitrionas: serverTimer.anfitrionas || ''
                };

                setTimers(prev => [...prev, newTimer]);
              }
            } else {
              // Si ya existe, nos aseguramos de que su estado de pausa, inicio y restante se actualicen si el servidor manda un start time diferente
              setTimers(prev =>
                prev.map(t => {
                  if (t.servicioId === serverTimer.servicioId) {
                    const dbStartTime = new Date(serverTimer.startTime);
                    const dbIsPaused = serverTimer.isPaused === true;

                    // Si cambiaron datos clave, actualizamos
                    if (
                      t.startTime.getTime() !== dbStartTime.getTime() ||
                      t.isPaused !== dbIsPaused ||
                      t.roomId !== serverTimer.roomId ||
                      t.duration !== serverTimer.duration ||
                      t.anfitrionas !== (serverTimer.anfitrionas || '')
                    ) {
                      const dbStartTimeParsed = parseDateSafe(serverTimer.startTime);
                      const now = new Date(Date.now() + serverOffset);
                      const elapsedSeconds = Math.floor(
                        (now.getTime() - dbStartTimeParsed.getTime()) / 1000
                      );

                      const durationMins = Number(serverTimer.duration || 0);
                      let remainingSeconds = Math.max(0, durationMins * 60 - elapsedSeconds);

                      // Grace period para desfase de reloj
                      if (remainingSeconds === 0 && durationMins > 0 && elapsedSeconds < 120) {
                        remainingSeconds = durationMins * 60;
                      }

                      return {
                        ...t,
                        roomId: serverTimer.roomId,
                        roomName: serverTimer.roomName,
                        duration: durationMins,
                        isPaused: dbIsPaused,
                        startTime: dbStartTimeParsed,
                        remainingTime: remainingSeconds,
                        anfitrionas: serverTimer.anfitrionas || ''
                      };
                    }
                  }
                  return t;
                })
              );
            }
          });

          // Remover timers locales que ya no están activos en el servidor
          const serverTimerIds = new Set(serverTimers.map((t: any) => t.servicioId));
          setTimers(prev => {
            const filtered = prev.filter(timer => {
              // Mantener timers temporales
              if (timer.isTemporary) return true;
              // Para ventas y servicios, verificar que estén en el servidor
              return serverTimerIds.has(timer.servicioId);
            });
            return filtered;
          });
        }
      } catch (error) {
        console.error('[TimerContext] Error sincronizando timers activos:', error);
      }
    };

    // Si es una página pública, no sincronizar periódicamente
    const isPublic =
      !window.location.pathname ||
      window.location.pathname === '/' ||
      window.location.pathname === '/landing' ||
      window.location.pathname === '/login';
    
    if (isPublic || !isInitialized || periodicSyncStartedRef.current) return;

    // Sincronizar cada 60 segundos como respaldo — la sincronización principal es via SSE.
    // El primer fetch ya se hizo en el useEffect de inicialización.
    periodicSyncStartedRef.current = true;
    const interval = setInterval(syncActiveTimers, 60000);

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
  const sseUrl = (typeof window !== 'undefined' && 
    window.location.pathname !== '/' && 
    window.location.pathname !== '/landing' && 
    window.location.pathname !== '/login') 
    ? '/api/notifications/sse' 
    : null;

  useSSE(sseUrl, (payload) => {
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
        t => t.servicioId === servicioId && t.servicioCode === codigo
      );

      if (!existingTimer) {

        const now = new Date(Date.now() + serverOffset);
        const start = parseDateSafe(startTime);
        const elapsedSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);

        const durationMins = Number(duration || 0);
        let remainingSeconds = Math.max(0, durationMins * 60 - elapsedSeconds);

        if (remainingSeconds === 0 && durationMins > 0 && elapsedSeconds < 120) {
          remainingSeconds = durationMins * 60;
        }

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
      const { servicioId } = payload.data;
    
      setTimers(prev => {
        const updated = prev.filter(t => t.servicioId !== servicioId);
        saveTimersToStorage(updated);
        return updated;
      });

      // Notificar al módulo de ventas para que se refresque (real-time)
      if (refreshCallbackRef.current) {
        refreshCallbackRef.current(servicioId);
      }
      window.dispatchEvent(new CustomEvent('updateSales'));
    }

    if (payload?.type === 'timer_paused' && payload?.data) {
      const { servicioId, tipoTransaccion } = payload.data;
     
      setTimers(prev => {
        const updated = prev.map(t => {
          if (
            t.servicioId === servicioId &&
            t.tipoTransaccion === (tipoTransaccion || 'servicio')
          ) {
            const currentRemaining = calculateRemainingTime(t, serverOffset);
            return { ...t, isPaused: true, remainingTime: currentRemaining };
          }
          return t;
        });
        saveTimersToStorage(updated);
        return updated;
      });
    }

    // Evento: Se reanudó un timer de venta o servicio
    if (payload?.type === 'timer_resumed' && payload?.data) {
      const { servicioId, newStartTime, tipoTransaccion } = payload.data;

      setTimers(prev => {
        const updated = prev.map(t => {
          if (t.servicioId === servicioId && t.tipoTransaccion === tipoTransaccion) {
            const start = parseDateSafe(newStartTime);
            const now = new Date(Date.now() + serverOffset);
            const elapsedSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
            const remainingSeconds = Math.max(0, t.duration * 60 - elapsedSeconds);
            return {
              ...t,
              isPaused: false,
              startTime: start,
              remainingTime: remainingSeconds
            };
          }
          return t;
        });
        saveTimersToStorage(updated);
        return updated;
      });
    }

    // Evento: Se actualizó un timer (tiempo o habitación)
    if (payload?.type === 'timer_updated' && payload?.data) {
      const {
        servicioId,
        duration,
        roomId,
        roomName,
        tipoTransaccion,
        startTime,
        anfitrionas
      } = payload.data;
     
      setTimers(prev => {
        const updated = prev.map(t => {
          if (
            t.servicioId === servicioId &&
            t.tipoTransaccion === (tipoTransaccion || 'servicio')
          ) {
            const start = startTime ? parseDateSafe(startTime) : t.startTime;
            const now = new Date(Date.now() + serverOffset);
            const d = duration || t.duration;
            const elapsedSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
            const remainingSeconds = Math.max(0, d * 60 - elapsedSeconds);

            return {
              ...t,
              duration: d,
              roomId: roomId || t.roomId,
              roomName: roomName || t.roomName,
              startTime: start,
              remainingTime: remainingSeconds,
              anfitrionas: anfitrionas !== undefined ? anfitrionas : t.anfitrionas
            };
          }
          return t;
        });
        saveTimersToStorage(updated);
        return updated;
      });
    }
  });

  // Función para actualizar el estado de la habitación
  const updateRoomStatus = useCallback(async (roomId: string, status: number) => {
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
  const updateServiceStatus = useCallback(async (servicioId: string, status: number) => {
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
      servicioId: string,
      roomId: string,
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
        

        // PRIMERO: Eliminar el timer del estado local inmediatamente para evitar que se vuelva a mostrar
        setTimers(prev => prev.filter(t => t.id !== timerId));

        // Guardar inmediatamente en localStorage para asegurar que el timer se elimine de "roomTimers" sin esperar al efecto
        try {
          const newTimers = timersRef.current.filter(t => t.id !== timerId);
          saveTimersToStorage(newTimers);
        } catch (e) {
          console.warn('[TimerContext] No se pudo limpiar inmediatamente localStorage:', e);
        }

        // Usar los timers actuales (sin el timer que se está deteniendo) para verificar si hay otros activos en la misma habitación
        const currentTimers = timersRef.current;
        const otherTimersInSameRoom = currentTimers.filter(
          t => t.roomId === timer.roomId && t.id !== timerId && t.isActive
        );

        const updates = [];

        // Actualizar estado según el tipo de transacción
        if (timer.tipoTransaccion === 'servicio') {
          // Para servicios, actualizar el estado del servicio a Finalizado (1)
          updates.push(updateServiceStatus(timer.servicioId, 1));
        } else if (timer.tipoTransaccion === 'venta') {
          // Para ventas, finalizar la venta
          try {
            const response = await fetch(`/api/ventas/${timer.servicioId}/stop`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json'
              }
            });

            if (response.ok) {
              const data = await response.json();
             
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
          // Emitir evento global para que useSales y otros hooks refresquen
          window.dispatchEvent(new CustomEvent('updateSales'));
        }, 100); // 100ms es suficiente para que la DB se asiente

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
    async (roomId: string) => {
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
    async (servicioId: string) => {
      const timerToStop = timers.find(timer => timer.servicioId === servicioId);
      if (timerToStop) {
        await stopTimer(timerToStop.id, true, timerToStop); // true = es una parada manual, pasar el objeto timer
      } else {
        toast.error(`No se encontró un temporizador activo para el servicio ${servicioId}.`);
      }
    },
    [timers, stopTimer]
  );

  // Función para pausar el temporizador por ID de servicio (solo timers principales)
  const pauseTimerByServicioId = useCallback(
    (servicioId: string) => {
      setTimers(prev => {
        const updatedTimers = prev.map(timer => {
          // Solo pausar timers principales (no temporales) del servicio especificado
          if (timer.servicioId === servicioId && !timer.isTemporary) {
            const currentRemaining = calculateRemainingTime(timer, serverOffset);
            return { ...timer, isPaused: true, remainingTime: currentRemaining };
          }
          return timer;
        });

        return updatedTimers;
      });

      // Actualizar estado en DB a Pausado (3)
      updateServiceStatus(servicioId, 3);
    },
    [updateServiceStatus, serverOffset]
  );

  // Función para reanudar el temporizador por ID de servicio (solo timers principales)
  const resumeTimerByServicioId = useCallback(
    (servicioId: string) => {
      setTimers(prev =>
        prev.map(timer => {
          if (timer.servicioId === servicioId && !timer.isTemporary) {
            const now = new Date(Date.now() + serverOffset);
            const elapsedSeconds = timer.duration * 60 - timer.remainingTime;
            const newStartTime = new Date(now.getTime() - elapsedSeconds * 1000);
            return { ...timer, isPaused: false, startTime: newStartTime };
          }
          return timer;
        })
      );

      // Actualizar estado en DB a En proceso (2)
      updateServiceStatus(servicioId, 2);
    },
    [updateServiceStatus, serverOffset]
  );

  // Función para obtener temporizador por ID de habitación
  const getTimerByRoomId = useCallback(
    (roomId: string) => {
      return timers.find(timer => timer.roomId === roomId);
    },
    [timers]
  );

  // Función para obtener temporizador por ID de servicio (solo timers principales)
  const getTimerByServicioId = useCallback(
    (servicioId: string) => {
      return timers.find(timer => timer.servicioId === servicioId && !timer.isTemporary);
    },
    [timers]
  );

  // Función para obtener temporizador temporal por ID de servicio
  const getTemporaryTimerByServicioId = useCallback(
    (servicioId: string) => {
      return timers.find(timer => timer.servicioId === servicioId && timer.isTemporary);
    },
    [timers]
  );

  // Efecto para manejar el conteo regresivo (OPTIMIZADO)
  // Este intervalo ya no actualiza el estado cada segundo a menos que un timer expire.
  // Esto evita re-renders masivos de toda la aplicación.
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(() => {
      const currentTimers = timersRef.current;
      const expiredTimerIds: string[] = [];
      let stateNeedsUpdate = false;
      const now = new Date(Date.now() + serverOffset);

      // SOLO buscar timers que acaban de expirar o que necesitan cambio de estado auto-pausa
      currentTimers.forEach(timer => {
        if (!timer.isActive) return;

        // --- INICIO AVISOS POR VOZ ---
        if (!timer.isPaused) {
          const remSeconds = calculateRemainingTime(timer, serverOffset);
          const remMinutes = Math.floor(remSeconds / 60);

          if (
            (remMinutes === 5 || remMinutes === 1) &&
            timer.lastAnnouncedMinute !== remMinutes &&
            remSeconds > 0
          ) {
            announceVoice(
              `Atención: quedan ${remMinutes} minuto${remMinutes > 1 ? 's' : ''} en ${timer.roomName}`
            );
            // Actualizar localmente el minuto anunciado para no repetir
            timer.lastAnnouncedMinute = remMinutes;
          }
        }
        // --- FIN AVISOS POR VOZ ---

        // Lógica de auto-pausa/reanudación por timers temporales
        if (!timer.isTemporary) {
          const hasActiveTemporaryTimer = currentTimers.some(
            t =>
              t.servicioId === timer.servicioId &&
              t.isTemporary &&
              t.isActive &&
              calculateRemainingTime(t, serverOffset) > 0
          );

          if (hasActiveTemporaryTimer && !timer.isPaused) {
            stateNeedsUpdate = true;
          } else if (!hasActiveTemporaryTimer && timer.isPaused && timer.pausedByTemp) {
            stateNeedsUpdate = true;
          }
        }

        // Lógica de expiración
        if (!timer.isPaused) {
          const remaining = calculateRemainingTime(timer, serverOffset);
          if (remaining <= 0 && !expiredTimers.has(timer.id)) {
            expiredTimerIds.push(timer.id);
            stateNeedsUpdate = true;
          }
        }
      });

      if (stateNeedsUpdate) {
        setTimers(prev => {
          const updated = prev.map(timer => {
            // Aplicar auto-pausa/reanudación si aplica
            if (!timer.isTemporary) {
              const hasActiveTemp = prev.some(
                t =>
                  t.servicioId === timer.servicioId &&
                  t.isTemporary &&
                  t.isActive &&
                  calculateRemainingTime(t, serverOffset) > 0
              );
              if (hasActiveTemp && !timer.isPaused) {
                const currentRemaining = calculateRemainingTime(timer, serverOffset);
                return {
                  ...timer,
                  isPaused: true,
                  pausedByTemp: true,
                  remainingTime: currentRemaining
                };
              }
              if (!hasActiveTemp && timer.isPaused && timer.pausedByTemp) {
                const now = new Date(Date.now() + serverOffset);
                const elapsedSeconds = timer.duration * 60 - (timer.remainingTime || 0);
                const newStartTime = new Date(now.getTime() - elapsedSeconds * 1000);
                return { ...timer, isPaused: false, pausedByTemp: false, startTime: newStartTime };
              }
            }

            // Aplicar expiración
            if (!timer.isPaused) {
              const rem = calculateRemainingTime(timer, serverOffset);
              if (rem <= 0) {
                return { ...timer, isActive: false, remainingTime: 0 };
              }
            }
            return timer;
          });
          return updated;
        });

        // Procesar expiraciones (notificaciones)
        expiredTimerIds.forEach(timerId => {
          const timer = currentTimers.find(t => t.id === timerId);
          if (timer) {
            showTimerExpiredNotification(timer);
            if (timer.isTemporary) {
              if (timer.onComplete) timer.onComplete();
              setTimeout(() => resumeTimerByServicioId(timer.servicioId), 200);
            } else {
              stopTimer(timerId, false, timer);
            }
          }
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [
    isInitialized,
    expiredTimers,
    serverOffset,
    resumeTimerByServicioId,
    stopTimer,
    showTimerExpiredNotification
  ]);

  // Función para actualizar un temporizador existente
  const updateTimerByServicioId = useCallback((servicioId: string, newDuration: number) => {
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
    (servicioId: string) => {
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
      servicioId: string,
      roomId: string,
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
              const currentRemaining = calculateRemainingTime(timer, serverOffset);
              return { ...timer, isPaused: true, remainingTime: currentRemaining };
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
      serverOffset,
      getAccurateNow,
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
      serverOffset,
      getAccurateNow,
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

// Hook de alto rendimiento para el conteo regresivo local
export const useCountdown = (timer: Timer | undefined) => {
  const { serverOffset } = useTimer();
  const [remainingTime, setRemainingTime] = useState(
    timer ? calculateRemainingTime(timer, serverOffset) : 0
  );

  useEffect(() => {
    if (!timer || !timer.isActive) {
      setRemainingTime(0);
      return;
    }

    if (timer.isPaused) {
      setRemainingTime(timer.remainingTime);
      return;
    }

    // Inicializar el tiempo restante inmediatamente
    setRemainingTime(calculateRemainingTime(timer, serverOffset));

    // Tick local cada segundo
    const interval = setInterval(() => {
      const newRemaining = calculateRemainingTime(timer, serverOffset);
      setRemainingTime(newRemaining);

      if (newRemaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timer, serverOffset]);

  return remainingTime;
};

