import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface NotificationData {
  id: number;
  codigo: string;
  cliente: string;
  mesero?: string;
  anfitriona?: string;
  total: number;
  timestamp?: string;
  createdBy?: number;
}

export function useNotifications() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastNotification, setLastNotification] = useState<any>(null);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [pendingServiceRequestsCount, setPendingServiceRequestsCount] = useState(0);
  const isConnectingRef = useRef(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const { user } = useCurrentUser();

  const loadPendingCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/pending-count');

      if (res.ok) {
        const data = await res.json();

        setPendingOrdersCount(data.pedidosCount || 0);
        setPendingServiceRequestsCount(data.solicitudesCount || 0);
      }
    } catch (error) {
      console.error('[useNotifications] Error cargando conteos de notificaciones:', error);
    }
  }, []);

  // Cargar ambos conteos de notificaciones al inicializar
  useEffect(() => {
    loadPendingCounts();
  }, [loadPendingCounts]);

  // Actualizar conteos cuando se disparen eventos locales
  useEffect(() => {
    const handleRefresh = () => loadPendingCounts();

    window.addEventListener('updatePendingOrders', handleRefresh);
    window.addEventListener('updateServiceRequests', handleRefresh);
    window.addEventListener('refreshNotifications', handleRefresh);

    return () => {
      window.removeEventListener('updatePendingOrders', handleRefresh);
      window.removeEventListener('updateServiceRequests', handleRefresh);
      window.removeEventListener('refreshNotifications', handleRefresh);
    };
  }, [loadPendingCounts]);

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
            {data.anfitriona && (
              <div className='flex items-center gap-2'>
                <span className='font-medium'>Anfitriona:</span>
                <span>{data.anfitriona}</span>
              </div>
            )}
            <div className='flex items-center gap-2'>
              <span className='font-medium'>Total:</span>
              <span className='font-bold text-green-600'>
                ${data.total.toLocaleString('es-ES')}
              </span>
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

  const showServiceNotification = useCallback(
    (data: any) => {
      if (user && data.createdBy && user.id === data.createdBy) {
        const event = new CustomEvent('updateServiceRequests');
        window.dispatchEvent(event);
        return;
      }
      playNotificationSound();
      toast.success(`¡NUEVA SOLICITUD DE SERVICIO! #${data.id}`, {
        description: (
          <div className='space-y-1 text-sm'>
            <div className='flex items-center gap-2'>
              <span className='font-medium'>Cliente:</span>
              <span>{data.cliente || 'Sin cliente registrado'}</span>
            </div>
            <div className='flex items-center gap-2'>
              <span className='font-medium'>Habitación:</span>
              <span>{data.habitacion_nombre || data.habitacion_id || 'N/A'}</span>
            </div>
            <div className='flex items-center gap-2'>
              <span className='font-medium'>Solicitado por:</span>
              <span>{data.solicitado_por_nombre || data.solicitado_por_nick || 'N/A'}</span>
            </div>
            <div className='flex items-center gap-2'>
              <span className='font-medium'>Total:</span>
              <span className='font-bold text-green-600'>
                ${data.total?.toLocaleString('es-ES')}
              </span>
            </div>
          </div>
        ),
        duration: 5000
      });
      const event = new CustomEvent('updateServiceRequests');
      window.dispatchEvent(event);
      const openModalEvent = new CustomEvent('openServiceRequestModal', { detail: { servicioId: data.id } });
      window.dispatchEvent(openModalEvent);
    },
    [user]
  );

  const cleanup = () => {
    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch (_) {}
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  };

  const connectSSE = useCallback(() => {
    if (isConnectingRef.current || eventSourceRef.current) {
      return;
    }
    isConnectingRef.current = true;

    const es = new EventSource('/api/notifications/sse');
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
      setConnectionAttempts(0);
      isConnectingRef.current = false;
    };

    es.onmessage = event => {
      try {
        const payload = JSON.parse(event.data);

        if (payload?.type === 'new_order' && payload?.data) {
          showNotification(payload.data as NotificationData);

          setPendingOrdersCount(prev => {
            const newCount = prev + 1;

            return newCount;
          });
          setLastNotification({ type: 'new_order', data: payload.data, timestamp: Date.now() });
        }

        if (payload?.type === 'new_service_request' && payload?.data) {
          showServiceNotification(payload.data);

          // Incrementar contador de solicitudes de servicio

          setPendingServiceRequestsCount(prev => {
            const newCount = prev + 1;

            return newCount;
          });

          setLastNotification({
            type: 'new_service_request',
            data: payload.data,
            timestamp: Date.now()
          });

          // Disparar evento para actualizar listas
          const updateEvent = new CustomEvent('updateServiceRequests');
          window.dispatchEvent(updateEvent);
        }

        if (
          payload?.type === 'service_request_approved' ||
          payload?.type === 'service_request_rejected'
        ) {
          // Decrementar el contador cuando se aprueba o rechaza
          setPendingServiceRequestsCount(prev => Math.max(0, prev - 1));
          // Disparar evento para actualizar listas
          const updateEvent = new CustomEvent('updateServiceRequests');
          window.dispatchEvent(updateEvent);
        }

        if (payload?.type === 'order_updated') {
          const updateEvent = new CustomEvent('updatePendingOrders');
          window.dispatchEvent(updateEvent);
        }
      } catch (err) {
        console.error('[useNotifications] Error al parsear mensaje:', err);
      }
    };

    es.onerror = () => {
      cleanup();
      isConnectingRef.current = false;
      setConnectionAttempts(c => c + 1);
      setTimeout(connectSSE, 3000);
    };
  }, [showNotification]);

  const reconnect = useCallback(() => {
    cleanup();
    setConnectionAttempts(c => c + 1);
   
    setTimeout(connectSSE, 200);
  }, [connectSSE]);

  useEffect(() => {
    connectSSE();
    return () => {
      cleanup();
    };
  }, [connectSSE]);

  return {
    isConnected,
    connectionAttempts,
    reconnect,
    lastNotification,
    pendingOrdersCount,
    pendingServiceRequestsCount
  };
}
