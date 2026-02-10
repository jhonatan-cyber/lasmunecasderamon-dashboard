import { useEffect, useRef } from 'react';

interface OrderUpdateData {
  type: 'order-processed' | 'order-deleted' | 'order-created';
  orderId: number;
  timestamp: string;
}

/**
 * Hook para escuchar actualizaciones de pedidos en tiempo real mediante SSE
 * @param onOrderUpdate - Callback que recibe el tipo de actualización y el ID del pedido
 */
export function useOrdersSSE(onOrderUpdate: (data: OrderUpdateData) => void) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    const connectSSE = () => {
      try {

        const eventSource = new EventSource('/api/orders/sse');
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {

          reconnectAttemptsRef.current = 0;
        };

        eventSource.onmessage = (event) => {
          try {

            const data = JSON.parse(event.data);

            if (data.type === 'connected') {

              return;
            }

            if (data.type === 'order-processed' || data.type === 'order-deleted' || data.type === 'order-created') {

              if (data.type === 'order-processed') {
                window.dispatchEvent(new CustomEvent('closeOrderModal', {
                  detail: { orderId: data.orderId }
                }));
              }

              // Llamar al callback con los datos del evento para actualizar el estado
              onOrderUpdate({
                type: data.type,
                orderId: data.orderId,
                timestamp: data.timestamp
              });

              // Actualizar la campanita de notificaciones con los datos del evento
              window.dispatchEvent(new CustomEvent('updatePendingOrders', {
                detail: {
                  type: data.type,
                  orderId: data.orderId
                }
              }));
              window.dispatchEvent(new CustomEvent('refreshNotifications'));
            }
          } catch (error) {
            console.error('❌ [ORDERS SSE] Error al procesar mensaje:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('❌ [ORDERS SSE] Error en conexión:', error);
          eventSource.close();


          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);


            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++;
              connectSSE();
            }, delay);
          }
        };
      } catch (error) {
        console.error('❌ [ORDERS SSE] Error al crear conexión:', error);
      }
    };


    connectSSE();


    return () => {

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [onOrderUpdate]);

  return null;
}
