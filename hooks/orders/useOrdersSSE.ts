import { useSSE } from '@/hooks/shared/useSSE';

interface OrderUpdateData {
  type: 'order-processed' | 'order-deleted' | 'order-created';
  orderId: number;
  timestamp: string;
}

export function useOrdersSSE(onOrderUpdate: (data: OrderUpdateData) => void) {

  useSSE('/api/orders/sse', (data) => {
    if (data.type === 'connected') {
      return;
    }

    if (
      data.type === 'order-processed' ||
      data.type === 'order-deleted' ||
      data.type === 'order-created'
    ) {
      if (data.type === 'order-processed') {
        window.dispatchEvent(
          new CustomEvent('closeOrderModal', {
            detail: { orderId: data.orderId }
          })
        );
      }

      onOrderUpdate({
        type: data.type,
        orderId: data.orderId,
        timestamp: data.timestamp
      });

      window.dispatchEvent(
        new CustomEvent('updatePendingOrders', {
          detail: {
            type: data.type,
            orderId: data.orderId
          }
        })
      );
      window.dispatchEvent(new CustomEvent('refreshNotifications'));
    }
  });

  return null;
}
