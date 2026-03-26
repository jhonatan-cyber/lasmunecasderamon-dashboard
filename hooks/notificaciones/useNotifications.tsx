/* eslint-disable */
import { useCallback, useEffect, useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useQuery } from '@tanstack/react-query';
import { playNotificationSound, announcePriority } from '@/lib/utils/audioUtils';
import { useSSE } from '@/hooks/shared/useSSE';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

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
  const [lastNotification, setLastNotification] = useState<any>(null);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [pendingServiceRequestsCount, setPendingServiceRequestsCount] = useState(0);
  const { user } = useCurrentUser();
  const pathname = usePathname();

  const { data: pendingCounts, refetch: refetchCounts } = useQuery({
    queryKey: ['notifications', 'pending-count'],
    queryFn: async () => {
      // No pedir conteos si no hay usuario o es página pública
      const isPublic = !pathname || pathname === '/' || pathname === '/landing' || pathname === '/login';
      if (!user || isPublic) return { pedidosCount: 0, solicitudesCount: 0 };

      const res = await fetch('/api/notifications/pending-count');
      if (!res.ok) throw new Error('Failed to fetch pending counts');
      return res.json();
    },
    staleTime: 20000,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    enabled: !!user // Solo habilitar si hay usuario
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
      const isCajeroOrAdmin = userRole === 'administrador' || userRole === 'cajero';
      const shouldShowAlert = isCajeroOrAdmin;

      // Actualizar el estado de la aplicación siempre
      const updateEvent = new CustomEvent('updatePendingOrders', {
        detail: { type: 'order-created', orderId: data.id }
      });
      window.dispatchEvent(updateEvent);

      // Solo mostrar alerta intrusiva si está en el dashboard
      if (!shouldShowAlert) {
        return;
      }

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
                {formatCurrencyCLP(data.total)}
              </span>
            </div>
          </div>
        ),
        duration: 5000
      });

      const openModalEvent = new CustomEvent('openOrderModal', {
        detail: { orderId: data.id, codigo: data.codigo }
      });
      window.dispatchEvent(openModalEvent);
    },
    [user, pathname]
  );

  const showServiceNotification = useCallback(
    (data: any) => {
      const userRole = (user?.role as any)?.name?.toLowerCase() || (user?.role as string)?.toLowerCase();
      const isCajeroOrAdmin = userRole === 'administrador' || userRole === 'cajero';
      const shouldShowAlert = isCajeroOrAdmin;

      const updateEvent = new CustomEvent('updateServiceRequests');
      window.dispatchEvent(updateEvent);

      if (user && data.createdBy && user.id === data.createdBy) {
        return;
      }

      if (userRole === 'anfitriona' || userRole === 'garzon') {
        return;
      }

      // Solo mostrar alerta intrusiva si está en el dashboard
      if (!shouldShowAlert) {
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
                {formatCurrencyCLP(data.total || 0)}
              </span>
            </div>
          </div>
        ),
        duration: 5000
      });

      const openModalEvent = new CustomEvent('openServiceRequestModal', { detail: data });
      window.dispatchEvent(openModalEvent);
    },
    [user, pathname]
  );

  const sseUrl = (!pathname || pathname === '/' || pathname === '/landing' || pathname === '/login' || !user) 
    ? null 
    : '/api/notifications/sse';

  const { reconnect } = useSSE(sseUrl, (payload) => {
    const userRole = (user?.role as any)?.name?.toLowerCase() || (user?.role as string)?.toLowerCase();

    if (payload?.type === 'new_order' && payload?.data) {
      showNotification(payload.data as NotificationData);
      setPendingOrdersCount(prev => prev + 1);
      setLastNotification({ type: 'new_order', data: payload.data, timestamp: Date.now() });
    }

    if (payload?.type === 'new_service_request' && payload?.data) {
      showServiceNotification(payload.data);
      setPendingServiceRequestsCount(prev => prev + 1);

      setLastNotification({
        type: 'new_service_request',
        data: payload.data,
        timestamp: Date.now()
      });

      window.dispatchEvent(new CustomEvent('updateServiceRequests'));
    }

    if (
      payload?.type === 'service_request_approved' ||
      payload?.type === 'service_request_rejected'
    ) {
      setPendingServiceRequestsCount(prev => Math.max(0, prev - 1));
      window.dispatchEvent(new CustomEvent('updateServiceRequests'));
    }

    if (payload?.type === 'order_updated') {
      setPendingOrdersCount(prev => Math.max(0, prev - 1));
      window.dispatchEvent(new CustomEvent('updatePendingOrders'));
    }

    if (payload?.type === 'order_deleted' && payload?.data) {
      setPendingOrdersCount(prev => Math.max(0, prev - 1));
      window.dispatchEvent(new CustomEvent('updatePendingOrders', { detail: payload.data }));
    }

    if (payload?.type === 'categories_updated' && payload?.data) {
      window.dispatchEvent(new CustomEvent('categoriesUpdated', { detail: payload.data }));
    }

    if (payload?.type === 'sale_cancelled' && payload?.data) {
      window.dispatchEvent(new CustomEvent('ventaRegistrada'));
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

    if (payload?.type === 'anulacion_confirmada' || payload?.type === 'anulacion_rechazada') {
      window.dispatchEvent(new CustomEvent('ventaRegistrada'));
    }
  });

  return {
    isConnected: !!sseUrl,
    reconnect,
    lastNotification,
    pendingOrdersCount,
    pendingServiceRequestsCount
  };
}

