import { useSSE } from '@/hooks/shared';
import { appEventBus } from '@/lib/utils/eventBus';

interface OrderUpdateData {
  type: 'order-processed' | 'order-deleted' | 'order-created';
  orderId: string | number;
  timestamp: string;
}

/**
 * Traduce los eventos reales del stream de personal (`new_order`, `order_updated`,
 * `order_deleted`, con su payload en `data`) a los tipos que esperan los tableros.
 * Antes escuchaba nombres (`order-processed`...) que el servidor ya no emite, así que
 * la vista del garzón solo se refrescaba al recargar.
 */
export function useOrdersSSE(onOrderUpdate: (data: OrderUpdateData) => void) {
  useSSE('/api/orders/sse', frame => {
    if (!frame || frame.type === 'connected') {
      return;
    }

    const payload = frame.data ?? {};
    let type: OrderUpdateData['type'] | null = null;
    let orderId: string | number | null = null;

    if (frame.type === 'new_order') {
      type = 'order-created';
      orderId = payload.id ?? null;
    } else if (frame.type === 'order_deleted') {
      type = 'order-deleted';
      orderId = payload.id ?? null;
    } else if (frame.type === 'order_updated') {
      // `estado = 0` es "procesado": cierra el modal y lo saca de pendientes.
      // Cualquier otro estado solo implica refrescar la lista.
      type = Number(payload.estado) === 0 ? 'order-processed' : 'order-created';
      orderId = payload.orderId ?? null;
    }

    if (!type) {
      return;
    }

    if (type === 'order-processed' && orderId != null) {
      appEventBus.emit('closeOrderModal', { orderId });
    }

    onOrderUpdate({
      type,
      orderId: orderId ?? '',
      timestamp: frame.timestamp ?? ''
    });

    appEventBus.emit('updatePendingOrders', { type, orderId });
    appEventBus.emit('refreshNotifications');
  });

  return null;
}
