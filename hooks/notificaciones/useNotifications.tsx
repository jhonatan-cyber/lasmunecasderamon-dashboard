import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useQuery } from '@tanstack/react-query';
import { th } from 'date-fns/locale';

import { playNotificationSound, announcePriority } from '@/lib/audioUtils';

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

  const { data: pendingCounts, refetch: refetchCounts } = useQuery({
    queryKey: ['notifications', 'pending-count'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/pending-count');
      if (!res.ok) throw new Error('Failed to fetch pending counts');
      return res.json();
    },
    staleTime: 20000,
    refetchInterval: 30000,
    refetchOnWindowFocus: true
  });

  useEffect(() => {
    if (pendingCounts) {
      setPendingOrdersCount(pendingCounts.pedidosCount || 0);
      setPendingServiceRequestsCount(pendingCounts.solicitudesCount || 0);
    }
  }, [pendingCounts]);

  const loadPendingCounts = useCallback(async () => {
    refetchCounts();
  }, [refetchCounts]);

  useEffect(() => {
    const handleRefresh = () => refetchCounts();

    window.addEventListener('updatePendingOrders', handleRefresh);
    window.addEventListener('updateServiceRequests', handleRefresh);
    window.addEventListener('refreshNotifications', handleRefresh);

    return () => {
      window.removeEventListener('updatePendingOrders', handleRefresh);
      window.removeEventListener('updateServiceRequests', handleRefresh);
      window.removeEventListener('refreshNotifications', handleRefresh);
    };
  }, [refetchCounts]);

  const showNotification = useCallback(
    (data: NotificationData) => {


      if (user && data.createdBy && user.id === data.createdBy) {

        const event = new CustomEvent('updatePendingOrders', {
          detail: { type: 'order-created', orderId: data.id }
        });
        window.dispatchEvent(event);
        return;
      }
      if (user?.role?.toLowerCase() === 'anfitriona') {
        return;
      }

      const userRole = user?.role?.toLowerCase();
      const shouldShowModal = userRole === 'administrador' || userRole === 'cajero';

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


      const event = new CustomEvent('updatePendingOrders', {
        detail: { type: 'order-created', orderId: data.id }
      });
      window.dispatchEvent(event);

      if (shouldShowModal) {
        const openModalEvent = new CustomEvent('openOrderModal', { detail: { orderId: data.id } });
        window.dispatchEvent(openModalEvent);
      }
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
      const openModalEvent = new CustomEvent('openServiceRequestModal', { detail: data });
      window.dispatchEvent(openModalEvent);
    },
    [user]
  );

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch (_) { }
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

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
        const userRole = (user?.role as any)?.name?.toLowerCase() || (user?.role as string)?.toLowerCase();

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

          setPendingServiceRequestsCount(prev => {
            const newCount = prev + 1;

            return newCount;
          });

          setLastNotification({
            type: 'new_service_request',
            data: payload.data,
            timestamp: Date.now()
          });

          const updateEvent = new CustomEvent('updateServiceRequests');
          window.dispatchEvent(updateEvent);
        }

        if (
          payload?.type === 'service_request_approved' ||
          payload?.type === 'service_request_rejected'
        ) {
          setPendingServiceRequestsCount(prev => Math.max(0, prev - 1));

          const updateEvent = new CustomEvent('updateServiceRequests');
          window.dispatchEvent(updateEvent);
        }

        if (payload?.type === 'order_updated') {
          setPendingOrdersCount(prev => Math.max(0, prev - 1));
          const updateEvent = new CustomEvent('updatePendingOrders');
          window.dispatchEvent(updateEvent);
        }

        if (payload?.type === 'order_deleted' && payload?.data) {
          setPendingOrdersCount(prev => Math.max(0, prev - 1));
          const updateEvent = new CustomEvent('updatePendingOrders', { detail: payload.data });
          window.dispatchEvent(updateEvent);
        }

        if (payload?.type === 'categories_updated' && payload?.data) {
          const event = new CustomEvent('categoriesUpdated', { detail: payload.data });
          window.dispatchEvent(event);
        }

        if (payload?.type === 'sale_cancelled' && payload?.data) {
          const ventaEvent = new CustomEvent('ventaRegistrada');
          window.dispatchEvent(ventaEvent);
        }

        if (payload?.type === 'timer_warning_5m' && payload?.data) {
          const { room_name } = payload.data;
          toast.warning(`⚠️ 5 MINUTOS RESTANTES`, {
            description: `El tiempo en ${room_name} está por terminar.`
          });
          playNotificationSound();
          if (userRole === 'cajero' || userRole === 'administrador') {
            announcePriority(`Atención. Quedan 5 minutos en ${room_name}.`);
          }
        }

        if (payload?.type === 'timer_ended_event' && payload?.data) {
          const { room_name } = payload.data;
          toast.error(`⌛ TIEMPO AGOTADO`, {
            description: `El tiempo en ${room_name} ha finalizado.`
          });
          playNotificationSound();
          if (userRole === 'cajero' || userRole === 'administrador') {
            announcePriority(`Atención. Tiempo agotado en ${room_name}.`);
          }
          // Forzar refresco de habitaciones
          window.dispatchEvent(new CustomEvent('updateServiceRequests'));
        }

        if (payload?.type === 'service_assistance' && payload?.data) {
          const { roomName, assistanceType } = payload.data;
          toast.warning(`⚠️ SOLICITUD DE ASISTENCIA`, {
            description: `Habitación ${roomName} solicita: ${assistanceType}`,
            duration: 10000
          });
          playNotificationSound();
          if (userRole === 'cajero' || userRole === 'administrador') {
            announcePriority(`Atención. Solicitud de ${assistanceType} en habitación ${roomName}.`);
          }
        }

        if (payload?.type === 'anulacion_confirmada' && payload?.data) {
          const ventaEvent = new CustomEvent('ventaRegistrada');
          window.dispatchEvent(ventaEvent);
        }

        if (payload?.type === 'anulacion_rechazada' && payload?.data) {
          const ventaEvent = new CustomEvent('ventaRegistrada');
          window.dispatchEvent(ventaEvent);
        }
      } catch (err) {
        throw err instanceof Error ? err : new Error('Error al procesar mensaje SSE');
      }
    };

    es.onerror = () => {
      cleanup();
      isConnectingRef.current = false;
      setConnectionAttempts(c => c + 1);
      setTimeout(connectSSE, 3000);
    };
  }, [showNotification, showServiceNotification, cleanup]);

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
