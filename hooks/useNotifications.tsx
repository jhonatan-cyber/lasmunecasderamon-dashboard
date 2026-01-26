import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface NotificationData {
  id: number;
  codigo: string;
  cliente: string;
  mesero?: string;
  total: number;
  timestamp?: string;
  createdBy?: number;
}

export function useNotifications() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const isConnectingRef = useRef(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const { user } = useCurrentUser();

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => {});
    } catch (_) {}
  };

  const showNotification = useCallback(
    (data: NotificationData) => {
      if (user && data.createdBy && user.id === data.createdBy) {
        const event = new CustomEvent('updatePendingOrders');
        window.dispatchEvent(event);
        return;
      }
      // Para asegurar que todos vean la notificación durante la depuración, no filtramos por rol
      playNotificationSound();
      toast.success(`¡NUEVO PEDIDO! #${data.codigo}`, {
        description: (
          <div className='space-y-1 text-sm'>
            <div className='flex items-center gap-2'>
              <span className='font-medium'>Cliente:</span>
              <span>{data.cliente}</span>
            </div>
            {data.mesero && (
              <div className='flex items-center gap-2'>
                <span className='font-medium'>Mesero:</span>
                <span>{data.mesero}</span>
              </div>
            )}
            <div className='flex items-center gap-2'>
              <span className='font-medium'>Total:</span>
              <span className='font-bold text-green-600'>${data.total.toLocaleString('es-ES')}</span>
            </div>
          </div>
        ),
        duration: 5000
      });
      const event = new CustomEvent('updatePendingOrders');
      window.dispatchEvent(event);
      const openModalEvent = new CustomEvent('openOrderModal', { detail: { orderId: data.id } });
      window.dispatchEvent(openModalEvent);
    },
    [user]
  );

  const cleanup = () => {
    if (eventSourceRef.current) {
      try { eventSourceRef.current.close(); } catch (_) {}
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  };

  const connectSSE = useCallback(() => {
    if (isConnectingRef.current || eventSourceRef.current) return;
    isConnectingRef.current = true;

    const es = new EventSource('/api/notifications/sse');
    eventSourceRef.current = es;

    es.onopen = () => {
    
      setIsConnected(true);
      setConnectionAttempts(0);
      isConnectingRef.current = false;
    };

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.type === 'new_order' && payload?.data) {
 
          showNotification(payload.data as NotificationData);
        }
      } catch (err) {}
    };

    es.onerror = () => {
    
      cleanup();
      isConnectingRef.current = false;
      setConnectionAttempts((c) => c + 1);
      setTimeout(connectSSE, 3000);
    };
  }, [showNotification]);

  const reconnect = useCallback(() => {
    cleanup();
    setConnectionAttempts((c) => c + 1);
    // pequeño delay para evitar condiciones de carrera
    setTimeout(connectSSE, 200);
  }, [connectSSE]);

  useEffect(() => {
    connectSSE();
    return () => {
      cleanup();
    };
  }, [connectSSE]);

  return { isConnected, connectionAttempts, reconnect };
}
