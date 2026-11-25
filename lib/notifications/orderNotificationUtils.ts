import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

type OrderDeletionNotificationData = {
  id: string;
  meseroId: string | null;
  timestamp: string;
};

export function buildOrderDeletionNotificationData(
  pedidoId: string,
  meseroId: string | null | undefined
): OrderDeletionNotificationData {
  return {
    id: pedidoId,
    meseroId: meseroId ?? null,
    timestamp: getNowInBusinessTimezone()
  };
}
