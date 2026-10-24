'use client';

import { useEffect, useCallback } from 'react';
import { useSSE } from '@/hooks/shared';
import { saveTimersToStorage, loadTimersFromStorage } from './useTimerPersistence';
import { activeTimers, serverOffsetSignal, TimerInstance } from '@/lib/store/timerStore';
import { refreshTimerSnapshot } from '@/lib/store/timerSnapshot';
import { calculateRemainingTime } from '@/lib/utils/timeUtils';
import logger from '@/lib/utils/logger';
import { hasSynchronizedTimerClock } from '@/lib/utils/timerClock';

interface TimerSyncProps {
  isInitialized: boolean;
  setIsInitialized: (value: boolean) => void;
  onTimerStopped?: (servicioId: string) => void;
  setServerOffset: (offset: number) => void;
}

export function useTimerSync({
  isInitialized,
  setIsInitialized,
  onTimerStopped,
  setServerOffset
}: TimerSyncProps) {
  const syncTimers = useCallback(
    async (afterMutation = false) => {
      try {
        const previousIds = new Set(activeTimers.peek().map(t => t.servicioId));
        await refreshTimerSnapshot(afterMutation);
        setServerOffset(serverOffsetSignal.peek());
        for (const id of previousIds) {
          if (!activeTimers.peek().some(t => t.servicioId === id)) onTimerStopped?.(id);
        }
      } catch (error) {
        logger.captureException(error, { context: 'useTimerSync' });
        throw error;
      }
    },
    [setServerOffset, onTimerStopped]
  );

  useEffect(() => {
    if (['/', '/login'].includes(window.location.pathname)) {
      setIsInitialized(true);
      return;
    }
    let cancelled = false;
    syncTimers()
      .catch(() => {
        if (cancelled) return;

        try {
          activeTimers.value = loadTimersFromStorage()
            .filter(t => t.expiresAt && hasSynchronizedTimerClock())
            .flatMap(t => {
              const remaining = calculateRemainingTime(t, serverOffsetSignal.peek());
              return remaining > 0 ? [new TimerInstance(t, remaining)] : [];
            });
        } catch {
          activeTimers.value = [];
        }
      })
      .finally(() => {
        if (!cancelled) setIsInitialized(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isInitialized) saveTimersToStorage(activeTimers.value.map(t => t.toPlainObject()));
  }, [activeTimers.value, isInitialized]);

  const sseUrl =
    typeof window !== 'undefined' && !['/', '/login'].includes(window.location.pathname)
      ? '/api/notifications/sse'
      : null;
  useSSE(sseUrl, payload => {
    if (
      payload?.type === 'connected' ||
      payload?.type === 'service_changed' ||
      payload?.type === 'timers_updated' ||
      payload?.type?.startsWith('timer_')
    ) {
      void syncTimers(true).catch(() => {});
    }
  });

  useEffect(() => {
    if (!isInitialized || !sseUrl) return;
    const sync = () => {
      void syncTimers().catch(() => {});
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') sync();
    };
    const interval = window.setInterval(onVisible, 120_000);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', sync);
    window.addEventListener('updateSales', sync);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', sync);
      window.removeEventListener('updateSales', sync);
    };
  }, [isInitialized, syncTimers, sseUrl]);
}
