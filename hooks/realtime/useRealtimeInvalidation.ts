'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSharedSSE } from '@/hooks/shared/useSharedSSE';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { realtimeTargets, matchesTarget } from '@/lib/utils/realtimeTargets';

export function useRealtimeInvalidation(): void {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  const pending = useRef<Set<string>>(new Set());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    flushTimer.current = null;
    if (pending.current.size === 0) return;
    const targets = Array.from(pending.current);
    pending.current.clear();
    queryClient.invalidateQueries({ predicate: query => matchesTarget(query.queryKey, targets) });
  }, [queryClient]);

  const schedule = useCallback(
    (targets: readonly string[]) => {
      if (targets.length === 0) return;
      for (const target of targets) pending.current.add(target);
      // Una ráfaga de eventos (temporizadores) se resuelve con una sola invalidación.
      if (flushTimer.current) return;
      flushTimer.current = setTimeout(flush, 250);
    },
    [flush]
  );

  useEffect(
    () => () => {
      if (flushTimer.current) {
        clearTimeout(flushTimer.current);
        flushTimer.current = null;
      }
      pending.current.clear();
    },
    []
  );

  const sseUrl = user ? '/api/notifications/sse' : null;

  useSharedSSE(sseUrl, payload => {
    if (typeof payload?.type !== 'string') return;

    if (payload.type === 'connected') {
      // Los eventos perdidos durante una desconexión no se reproducen en el stream.
      void queryClient.invalidateQueries();
      return;
    }
    schedule(realtimeTargets(payload));
  });
}
