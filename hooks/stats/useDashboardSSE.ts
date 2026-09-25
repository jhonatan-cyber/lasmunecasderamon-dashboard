'use client';

import { useSharedSSE } from '@/hooks/shared/useSharedSSE';
import { invalidateQueries } from '@/lib/api/queryClient';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';

const DASHBOARD_EVENTS = new Set([
  'new_order',
  'order_updated',
  'order_deleted',
  'new_service_request',
  'service_request_processed',
  'service_request_deleted',
  'service_changed',
  'sale_cancelled',
  'updateSales',
  'timer_started',
  'timer_stopped',
  'timer_updated',
  'timers_updated',
  'room_available',
  'anulacion_processed',
  'code_changed'
]);

/**
 * Subscribes to SSE events and invalidates all dashboard queries
 * when an operational event occurs, replacing the old refetchInterval polling.
 */
export function useDashboardSSE() {
  const { user } = useCurrentUser();

  const isPublic =
    typeof window !== 'undefined' &&
    (window.location.pathname === '/' || window.location.pathname === '/login');

  const sseUrl = !user || isPublic ? null : '/api/notifications/sse';

  useSharedSSE(sseUrl, (payload: any) => {
    if (payload?.type && DASHBOARD_EVENTS.has(payload.type)) {
      invalidateQueries.dashboard();
    }
  });
}
