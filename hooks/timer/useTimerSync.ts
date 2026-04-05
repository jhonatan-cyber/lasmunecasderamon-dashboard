import { useEffect, useRef } from 'react';
import { Timer, saveTimersToStorage, loadTimersFromStorage } from '@/contexts/TimerContext';
import { parseDateSafe, calculateRemainingTime } from '@/lib/utils/timeUtils';
import { useSSE } from '@/hooks/shared/useSSE';
import { batch } from '@preact/signals-react';

import { activeTimers, serverOffsetSignal, TimerInstance } from '@/lib/store/timerStore';

interface TimerSyncProps {
  isInitialized: boolean;
  setIsInitialized: (val: boolean) => void;
  onTimerStopped?: (servicioId: string) => void;
  setServerOffset: (offset: number) => void; // Aún lo pasamos para sync interno
}

/**
 * Hook que gestiona la sincronización de timers con la DB (via REST/SSE)
 * y la persistencia en localStorage.
 */
export function useTimerSync({
  isInitialized,
  setIsInitialized,
  onTimerStopped,
  setServerOffset
}: TimerSyncProps) {
  const initialSyncExecutedRef = useRef(false);
  const periodicSyncStartedRef = useRef(false);

  // --- PERSISTENCIA LOCAL ---
  useEffect(() => {
    if (isInitialized) {
      const timers = activeTimers.value.map(t => t.toPlainObject());
      // Limpiar duplicados antes de guardar
      const unique = timers.filter(
        (t, i, self) =>
          i === self.findIndex(x => x.roomId === t.roomId && x.servicioCode === t.servicioCode)
      );
      saveTimersToStorage(unique);
    }
  }, [activeTimers.value, isInitialized]);

  // --- SINCRONIZACIÓN INICIAL ---
  useEffect(() => {
    if (initialSyncExecutedRef.current) return;
    initialSyncExecutedRef.current = true;

    console.log('[useTimerSync] Performing initial sync...');
    
    const performInitialSync = async () => {
      const stored = loadTimersFromStorage();
      console.log('[useTimerSync] Stored timers from localStorage:', stored.length);
      const serverOffset = serverOffsetSignal.peek();

      const aliveTimers = stored
        .map(t => ({
          ...t,
          remainingTime: calculateRemainingTime(t, serverOffset),
          isActive: calculateRemainingTime(t, serverOffset) > 0
        }))
        .filter(t => t.isActive);

      console.log('[useTimerSync] Alive timers from storage:', aliveTimers.length);

      try {
        const res = await fetch('/api/timers/active?source=web');
        const json = await res.json();
        console.log('[useTimerSync] API response:', json);

        const { success, data, serverTime } = json;

        if (success && Array.isArray(data)) {
          if (serverTime) {
            const newOffset = new Date(serverTime).getTime() - Date.now();
            setServerOffset(newOffset);
            serverOffsetSignal.value = newOffset;
          }

          const finalTimers = data
            .map((dbT: any) => {
              const currentOffset = serverOffsetSignal.peek();
              const now = new Date(Date.now() + currentOffset);
              const start = parseDateSafe(dbT.startTime);
              const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);
              const durationSecs = Number(dbT.duration || 0) * 60;
              let remaining = Math.max(0, durationSecs - elapsed);

              if (remaining === 0 && durationSecs > 0 && elapsed < 120) {
                remaining = durationSecs;
              }

              return {
                id: `${dbT.servicioId}-${dbT.roomId}-${Date.now()}`,
                servicioId: dbT.servicioId,
                roomId: dbT.roomId,
                roomName: dbT.roomName,
                duration: dbT.duration,
                remainingTime: remaining,
                isActive: remaining > 0,
                isPaused: dbT.isPaused === true,
                startTime: start,
                servicioCode: dbT.codigo,
                clienteNombre: dbT.clienteNombre,
                tipoTransaccion: dbT.tipoTransaccion || 'servicio',
                anfitrionas: dbT.anfitrionas || ''
              };
            })
            .filter((t: any) => t.isActive);

          activeTimers.value = finalTimers.map(t => new TimerInstance(t, t.remainingTime));
        } else {
          activeTimers.value = aliveTimers.map(t => new TimerInstance(t, t.remainingTime));
        }
      } catch (err) {
        activeTimers.value = aliveTimers.map(t => new TimerInstance(t, t.remainingTime));
      } finally {
        setIsInitialized(true);
      }
    };

    const isPublic = ['/', '/login', '/landing'].includes(window.location.pathname);
    if (isPublic) {
      setIsInitialized(true);
      return;
    }

    initialSyncExecutedRef.current = true;
    performInitialSync();
  }, []);

  // --- SINCRONIZACIÓN SSE (REAL TIME) ---
  const sseUrl =
    typeof window !== 'undefined' && !['/', '/login', '/landing'].includes(window.location.pathname)
      ? '/api/notifications/sse'
      : null;

  useSSE(sseUrl, payload => {
    if (!payload?.type || !payload.data) return;
    const serverOffset = serverOffsetSignal.peek();

    switch (payload.type) {
      case 'timer_started': {
        const { servicioId, codigo, roomId, duration, startTime } = payload.data;

        // Verificar si ya existe un timer para este servicio (incluyendo locales y SSE)
        const existing = activeTimers.peek().find(t => t.servicioId === servicioId);
        if (existing) {
          console.log(`[useTimerSync] Timer ${servicioId} ya existe, ignorando evento SSE`);
          return;
        }

        const start = parseDateSafe(startTime);
        const elapsed = Math.floor((Date.now() + serverOffset - start.getTime()) / 1000);
        const remaining = Math.max(0, (duration || 0) * 60 - elapsed);

        if (remaining > 0) {
          const newT = new TimerInstance(
            {
              id: `${servicioId}-${roomId}-${Date.now()}`,
              ...payload.data,
              startTime: start,
              isActive: true,
              isPaused: false,
              servicioCode: codigo,
              clienteNombre: payload.data.clienteNombre || 'Sin Nombre'
            },
            remaining
          );
          activeTimers.value = [...activeTimers.peek(), newT];
        }
        break;
      }

      case 'timer_stopped': {
        const { servicioId } = payload.data;
        activeTimers.value = activeTimers.peek().filter(t => t.servicioId !== servicioId);
        if (onTimerStopped) onTimerStopped(servicioId);
        window.dispatchEvent(new CustomEvent('updateSales'));
        break;
      }

      case 'timer_paused': {
        const { servicioId } = payload.data;
        const target = activeTimers.peek().find(t => t.servicioId === servicioId);
        if (target) target.isPaused.value = true;
        break;
      }

      case 'timer_resumed': {
        const { servicioId, newStartTime } = payload.data;
        const target = activeTimers.peek().find(t => t.servicioId === servicioId);
        if (target) {
          // Actualización atómica de la instancia
          target.isPaused.value = false;
          // Si quisiéramos recalcular startTime, tendríamos que manejarlo en la instancia o el store
          // pero al ser signals, el tick seguirá restando.
        }
        break;
      }

      case 'timer_updated': {
        const { servicioId, duration, roomId, roomName, startTime, anfitrionas } = payload.data;
        const target = activeTimers.peek().find(t => t.servicioId === servicioId);

        if (target) {
          const start = startTime ? parseDateSafe(startTime) : target.startTime.peek();
          const dur = duration || target.duration.peek();
          const elapsed = Math.floor(
            (Date.now() + serverOffsetSignal.peek() - start.getTime()) / 1000
          );
          const remaining = Math.max(0, dur * 60 - elapsed);

          // ACTUALIZACIÓN QUIRÚRGICA: Solo los valores, sin tocar el array
          batch(() => {
            target.patch({
              duration: dur,
              roomId,
              roomName,
              startTime: start,
              anfitrionas
            });
            target.remainingSeconds.value = remaining;
          });
        }
        break;
      }
    }
  });

  // --- FALLBACK POLLING (60s) ---
  useEffect(() => {
    if (!isInitialized || periodicSyncStartedRef.current) return;

    const sync = async () => {
      try {
        const res = await fetch('/api/timers/active?source=poll');
        const data = await res.json();
        if (data.success) {
          // Lógica de merge simplificada:
          // 1. Agregar faltantes 2. Actualizar estados divergentes 3. Remover expirados
          const dbIds = new Set(data.data.map((t: any) => t.servicioId));
          activeTimers.value = activeTimers
            .peek()
            .filter(t => t.isTemporary || dbIds.has(t.servicioId));
        }
      } catch (e) {
        console.error('Poll failed', e);
      }
    };

    periodicSyncStartedRef.current = true;
    const interval = setInterval(sync, 60000);
    return () => clearInterval(interval);
  }, [isInitialized]);
}
