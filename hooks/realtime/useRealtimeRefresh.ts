'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSharedSSE } from '@/hooks/shared/useSharedSSE';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { matchesTarget, realtimeTargets } from '@/lib/utils/realtimeTargets';
import logger from '@/lib/utils/logger';
import { useRefreshOnFocus } from '@/hooks/shared/useRefreshOnFocus';

export function useRealtimeRefresh(
  resource: string,
  refresh: () => unknown | Promise<unknown>,
  enabled = true
) {
  const { user } = useCurrentUser();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRefresh = useRef(refresh);
  useEffect(() => {
    latestRefresh.current = refresh;
  }, [refresh]);

  const schedule = useCallback(() => {
    if (timer.current) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      Promise.resolve()
        .then(() => latestRefresh.current())
        .catch(error => {
          logger.captureException(error, { context: `realtime:${resource}` });
        });
    }, 250);
  }, [resource]);

  useRefreshOnFocus(schedule, { enabled: Boolean(user) && enabled, immediate: false });

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    },
    [resource, enabled]
  );

  useSharedSSE(user && enabled ? '/api/notifications/sse' : null, payload => {
    if (!enabled || !payload || typeof payload.type !== 'string') return;
    if (payload.type !== 'connected' && !matchesTarget([resource], realtimeTargets(payload)))
      return;
    schedule();
  });
}
