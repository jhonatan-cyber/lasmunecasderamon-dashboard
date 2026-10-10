'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Timer, saveTimersToStorage, loadTimersFromStorage } from '@/contexts/TimerContext';
import { parseDateSafe, calculateRemainingTime } from '@/lib/utils/timeUtils';
import { useSSE } from '@/hooks/shared';
import { batch } from '@preact/signals-react';

import logger from '@/lib/utils/logger';
import { activeTimers, serverOffsetSignal, TimerInstance } from '@/lib/store/timerStore';

const TIMER_SYNC_INTERVAL_MS = 120_000;

interface TimerSyncProps {
  isInitialized: boolean;
  setIsInitialized: (val: boolean) => void;
  onTimerStopped?: (servicioId: string) => void;
  setServerOffset: (offset: number) => void;
}

export function useTimerSync({
  isInitialized,
  setIsInitialized,
  onTimerStopped,
  setServerOffset
}: TimerSyncProps) {
  const initialSyncExecutedRef = useRef(false);
  const periodicSyncStartedRef = useRef(false);
  const syncInFlightRef = useRef(false);

  useEffect(() => {
    if (isInitialized) {
      const timers = activeTimers.value.map(t => t.toPlainObject());

      const unique = timers.filter(
        (t, i, self) => i === self.findIndex(x => x.servicioId === t.servicioId)
      );
      saveTimersToStorage(unique);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTimers.value, isInitialized]);

  useEffect(() => {
    if (initialSyncExecutedRef.current) return;
    initialSyncExecutedRef.current = true;

    const performInitialSync = async () => {
      const stored = loadTimersFromStorage();
      const serverOffset = serverOffsetSignal.peek();

      const aliveTimers = stored
        .map(t => ({
          ...t,
          remainingTime: calculateRemainingTime(t, serverOffset),
          isActive: calculateRemainingTime(t, serverOffset) > 0
        }))
        .filter(t => t.isActive);

      try {
        const res = await fetch('/api/timers/active?source=web', { cache: 'no-store' });
        const json = await res.json();

        const { success, data, serverTime } = json;

        if (success && Array.isArray(data)) {
          if (serverTime) {
            const newOffset = new Date(serverTime).getTime() - Date.now();
            setServerOffset(newOffset);
            serverOffsetSignal.value = newOffset;
          }

          const mappedTimers = data
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
                servicioId: String(dbT.servicioId),
                roomId: dbT.roomId,
                roomName: dbT.roomName,
                duration: dbT.duration,
                remainingTime: remaining,
                isActive: remaining > 0,
                isPaused: dbT.isPaused === true,
                isTemporary: dbT?.isTemporary === true,
                datosTemporales: dbT?.isTemporary
                  ? {
                      servicio_original_id: dbT?.servicioOriginalId
                        ? String(dbT.servicioOriginalId)
                        : null
                    }
                  : undefined,
                startTime: start,
                servicioCode: dbT.codigo,
                clienteNombre: dbT.clienteNombre,
                tipoTransaccion: dbT.tipoTransaccion || 'servicio',
                anfitrionas: dbT.anfitrionas || ''
              };
            })
            .filter((t: any) => t.isActive);

          const remainingByServiceId = new Map(
            mappedTimers.map((t: any) => [String(t.servicioId), Number(t.remainingTime || 0)])
          );

          const finalTimers = mappedTimers.map((t: any) => {
            if (!t.isTemporary) return t;
            const originalId = t?.datosTemporales?.servicio_original_id
              ? String(t.datosTemporales.servicio_original_id)
              : '';
            const frozen = originalId ? remainingByServiceId.get(originalId) : undefined;
            return {
              ...t,
              datosTemporales: {
                ...(t.datosTemporales || {}),
                ...(typeof frozen === 'number' ? { tiempo_principal_congelado: frozen } : {})
              }
            };
          });

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

    const isPublic = ['/', '/login'].includes(window.location.pathname);
    if (isPublic) {
      setIsInitialized(true);
      return;
    }

    initialSyncExecutedRef.current = true;
    performInitialSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The server is authoritative: reconcile additions, updates, and removals after
  // reconnects or missed SSE events. localStorage is only a startup fallback.
  const syncTimers = useCallback(async () => {
    if (!isInitialized || syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    try {
      const res = await fetch('/api/timers/active?source=poll', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Timer sync failed: HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success || !Array.isArray(data.data)) return;

      if (data.serverTime) {
        const offset = new Date(data.serverTime).getTime() - Date.now();
        setServerOffset(offset);
        serverOffsetSignal.value = offset;
      }

      const previousTimers = activeTimers.peek();
      const previousIds = new Set(previousTimers.map(timer => timer.servicioId));
      const existingById = new Map(
        previousTimers.map(timer => [`${timer.tipoTransaccion.peek()}:${timer.servicioId}`, timer])
      );
      const reconciled: TimerInstance[] = data.data.flatMap((serverTimer: any) => {
        const servicioId = String(serverTimer.servicioId ?? serverTimer.id ?? '');
        if (!servicioId) return [];

        const startTime = parseDateSafe(serverTimer.startTime);
        const duration = Number(serverTimer.duration || 0);
        const isPaused = serverTimer.isPaused === true;
        const remaining = Number.isFinite(Number(serverTimer.remainingTime))
          ? Math.max(0, Number(serverTimer.remainingTime))
          : calculateRemainingTime(
              { startTime, duration, isPaused, remainingTime: 0 },
              serverOffsetSignal.peek()
            );
        if (remaining <= 0 && !isPaused) return [];

        const tipoTransaccion = serverTimer.tipoTransaccion || 'servicio';
        const originalId = serverTimer.servicioOriginalId
          ? String(serverTimer.servicioOriginalId)
          : null;
        const datosTemporales = serverTimer.isTemporary
          ? { servicio_original_id: originalId }
          : undefined;
        const timerData = {
          id: `${tipoTransaccion}-${servicioId}`,
          servicioId,
          roomId: String(serverTimer.roomId ?? ''),
          roomName: serverTimer.roomName ?? '',
          duration,
          startTime,
          servicioCode: serverTimer.codigo ?? '',
          clienteNombre: serverTimer.clienteNombre ?? 'Sin Nombre',
          isActive: true,
          isPaused,
          isTemporary: serverTimer.isTemporary === true,
          datosTemporales,
          tipoTransaccion,
          anfitrionas: serverTimer.anfitrionas ?? ''
        } as const;

        const existing = existingById.get(`${tipoTransaccion}:${servicioId}`);
        if (!existing) return [new TimerInstance(timerData, remaining)];

        existing.patch(timerData);
        existing.remainingSeconds.value = remaining;
        return [existing];
      });

      activeTimers.value = reconciled;
      const nextIds = new Set(reconciled.map((timer: TimerInstance) => timer.servicioId));
      if (previousIds.size !== nextIds.size || [...previousIds].some(id => !nextIds.has(id))) {
        window.dispatchEvent(new CustomEvent('updateSales'));
      }
    } catch (e) {
      logger.captureException(e, { context: 'useTimerSync:timerPoll' });
    } finally {
      syncInFlightRef.current = false;
    }
  }, [isInitialized, setServerOffset]);

  const sseUrl =
    typeof window !== 'undefined' && !['/', '/login'].includes(window.location.pathname)
      ? '/api/notifications/sse'
      : null;

  useSSE(sseUrl, payload => {
    if (!payload?.type || !payload.data) return;
    const serverOffset = serverOffsetSignal.peek();

    switch (payload.type) {
      // Sync on SSE reconnect — reemplaza periodic polling
      case 'connected':
        syncTimers();
        break;

      case 'timers_updated':
        syncTimers();
        break;

      case 'timer_started': {
        const { servicioId, codigo, roomId, duration, startTime } = payload.data;

        const existing = activeTimers.peek().find(t => t.servicioId === servicioId);
        if (existing) {
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
          target.isPaused.value = false;
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

  // Reconcile on mount and periodically as a safety net for missed SSE messages.
  useEffect(() => {
    if (!isInitialized || periodicSyncStartedRef.current) return;
    periodicSyncStartedRef.current = true;
    syncTimers();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') syncTimers();
    }, TIMER_SYNC_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncTimers();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      periodicSyncStartedRef.current = false;
    };
  }, [isInitialized, syncTimers]);
}
