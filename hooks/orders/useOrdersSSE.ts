import { useSSE } from '@/hooks/shared';
import { appEventBus } from '@/lib/utils/eventBus';

interface OrderUpdateData {
  type: 'order-processed' | 'order-deleted' | 'order-created';
  orderId: string | number;
  timestamp: string;
}

export function useOrdersSSE(onOrderUpdate: (data: OrderUpdateData) => void) {
  useSSE('/api/orders/sse', data => {
    if (data.type === 'connected') {
      return;
    }

    if (
      data.type === 'order-processed' ||
      data.type === 'order-deleted' ||
      data.type === 'order-created'
    ) {
      if (data.type === 'order-processed') {
        appEventBus.emit('closeOrderModal', { orderId: data.orderId });
      }

      onOrderUpdate({
        type: data.type,
        orderId: data.orderId,
        timestamp: data.timestamp
      });

      appEventBus.emit('updatePendingOrders', {
        type: data.type,
        orderId: data.orderId
      });
      appEventBus.emit('refreshNotifications');
    }
  });

  return null;
}
