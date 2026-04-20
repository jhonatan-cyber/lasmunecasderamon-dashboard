'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { formatShortTimeEs } from '@/lib/utils/calendarUtils';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import useOrders from '@/hooks/servicios/useOrders';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { useCashRegisterStatus } from '@/hooks/caja/useCashRegisterStatus';
import { useNotificationsContext } from '@/contexts/NotificationsContext';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { ServiceRequestModal } from './ServiceRequestModal';

const OrderDetailModal = dynamic(() => import('@/components/orders/OrderDetailModal'), {
  loading: () => null,
  ssr: false
});

export function HeaderNotifications() {
  const { user } = useCurrentUser();
  const {
    orders,
    refetch,
    orderDetail,
    fetchOrderDetail,
    isDetailLoading,
    detailError,
    setOrders
  } = useOrders();
  const { hasPermission } = useUserPermissions();
  const { hasOpenCaja } = useCashRegisterStatus();

  const [showDropdown, setShowDropdown] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Order modal state
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrderCode, setSelectedOrderCode] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);

  // Service request state
  const [pendingServiceRequests, setPendingServiceRequests] = useState<any[]>([]);
  const [selectedServiceRequest, setSelectedServiceRequest] = useState<any | null>(null);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);

  const { pendingOrdersCount = 0, pendingServiceRequestsCount = 0 } = useNotificationsContext();
  const totalNotifications = pendingOrdersCount + pendingServiceRequestsCount;

  const isAnfitriona = user?.role?.toLowerCase() === 'anfitriona';
  const isGarzon = user?.role?.toLowerCase() === 'garzon';

  // Audio enable on first interaction
  const enableAudio = () => {
    if (audioRef.current) {
      audioRef.current
        .play()
        .then(() => {
          audioRef.current!.pause();
          audioRef.current!.currentTime = 0;
          setAudioEnabled(true);
        })
        .catch(() => {});
    }
  };

  useEffect(() => {
    const handleUserInteraction = () => {
      if (!audioEnabled) {
        enableAudio();
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
      }
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [audioEnabled]);

  // Order handling
  const pendingOrders = orders.filter((o: any) => String(o.estado) === '1');
  const getOrderId = (order: any) => order?.id_pedido ?? order?.id ?? order?.pedidoId ?? null;
  const getOrderKey = (order: any, index: number) =>
    getOrderId(order) ?? order?.codigo ?? order?.fecha_crea ?? `fallback-${index}`;

  const handleOrderClick = (orderId: string) => {
    if (!hasPermission('orders', 'process')) {
      toast.error('No tienes permisos para procesar pedidos');
      setShowDropdown(false);
      return;
    }
    if (hasOpenCaja === false) {
      toast.error(
        'No se puede procesar pedidos sin caja abierta. Por favor, abra una caja primero.'
      );
      setShowDropdown(false);
      return;
    }

    const order = orders.find((o: any) => String(getOrderId(o)) === orderId);
    setSelectedOrderId(orderId);
    setSelectedOrderCode(order?.codigo || '');
    setModalOpen(true);
    setShowDropdown(false);
    fetchOrderDetail(orderId);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedOrderId(null);
    setSelectedOrderCode('');
  };

  // Listen for external events to open order modal
  useEffect(() => {
    const handleOpenOrderModal = (event: CustomEvent) => {
      if (!hasPermission('orders', 'process')) {
        toast.error('No tienes permisos para procesar pedidos');
        return;
      }
      if (hasOpenCaja === false) {
        toast.error(
          'No se puede procesar pedidos sin caja abierta. Por favor, abra una caja primero.'
        );
        return;
      }

      const { orderId, codigo } = event.detail;
      const normalizedOrderId = String(orderId);
      const order = orders.find((o: any) => String(getOrderId(o)) === normalizedOrderId);
      setSelectedOrderId(normalizedOrderId);
      setSelectedOrderCode(codigo || order?.codigo || '');
      setModalOpen(true);
      fetchOrderDetail(normalizedOrderId);
    };

    window.addEventListener('openOrderModal', handleOpenOrderModal as EventListener);
    return () =>
      window.removeEventListener('openOrderModal', handleOpenOrderModal as EventListener);
  }, [fetchOrderDetail, orders, hasOpenCaja, hasPermission]);

  // Listen for external events to open service request modal
  useEffect(() => {
    const handleOpenServiceRequestModal = async (event: CustomEvent) => {
      const solicitud = (event.detail && event.detail.solicitud) || event.detail;
      if (!solicitud) return;

      setSelectedServiceRequest(solicitud);
      setServiceModalOpen(true);
      setShowDropdown(false);
    };

    window.addEventListener(
      'openServiceRequestModal',
      handleOpenServiceRequestModal as unknown as EventListener
    );
    return () =>
      window.removeEventListener(
        'openServiceRequestModal',
        handleOpenServiceRequestModal as unknown as EventListener
      );
  }, []);

  // Update pending orders from external events
  useEffect(() => {
    const handleUpdatePendingOrders = (event?: CustomEvent) => {
      if (event && event.detail) {
        const { type, orderId } = event.detail;
        const normalizedOrderId = String(orderId);
        if (type === 'order-processed' || type === 'order-deleted') {
          setOrders((prevOrders: any[]) =>
            prevOrders.filter((o: any) => String(getOrderId(o)) !== normalizedOrderId)
          );
        } else if (type === 'order-created') {
          refetch();
        }
      } else {
        refetch();
      }
    };

    window.addEventListener('updatePendingOrders', handleUpdatePendingOrders as EventListener);
    return () =>
      window.removeEventListener('updatePendingOrders', handleUpdatePendingOrders as EventListener);
  }, [refetch, setOrders]);

  // Close order modal from external event
  useEffect(() => {
    const handleCloseOrderModal = (event: CustomEvent) => {
      const processedOrderId = String(event.detail.orderId);
      if (modalOpen && selectedOrderId === processedOrderId) {
        handleCloseModal();
      }
    };

    window.addEventListener('closeOrderModal', handleCloseOrderModal as EventListener);
    return () =>
      window.removeEventListener('closeOrderModal', handleCloseOrderModal as EventListener);
  }, [modalOpen, selectedOrderId]);

  // Fetch pending service requests
  const fetchPendingServiceRequests = useCallback(async () => {
    try {
      const response = await fetch('/api/solicitudes-servicios?estado=pendiente');
      const data = await response.json();
      if (data.success) {
        setPendingServiceRequests(data.data || []);
      } else {
        setPendingServiceRequests([]);
      }
    } catch {
      setPendingServiceRequests([]);
    }
  }, []);

  useEffect(() => {
    fetchPendingServiceRequests();
  }, [fetchPendingServiceRequests]);

  useEffect(() => {
    const handleUpdateServiceRequests = () => fetchPendingServiceRequests();
    window.addEventListener('updateServiceRequests', handleUpdateServiceRequests);
    return () => window.removeEventListener('updateServiceRequests', handleUpdateServiceRequests);
  }, [fetchPendingServiceRequests]);

  const handleServiceClick = (solicitud: any) => {
    setSelectedServiceRequest(solicitud);
    setServiceModalOpen(true);
    setShowDropdown(false);
  };

  const handleServiceProcessed = () => {
    setSelectedServiceRequest(null);
    fetchPendingServiceRequests();
    window.dispatchEvent(new CustomEvent('updateServiceRequests'));
  };

  // Don't render for anfitrionas or garzones
  if (isAnfitriona || isGarzon) return null;

  return (
    <>
      <DropdownMenu open={showDropdown} onOpenChange={setShowDropdown}>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon' className='relative'>
            <Bell className={`h-5 w-5 bell-icon ${totalNotifications > 0 ? 'bell-ring' : ''}`} />
            {totalNotifications > 0 && (
              <span className='absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center badge-blink'>
                {totalNotifications}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-80 max-h-96 overflow-y-auto'>
          <DropdownMenuLabel>Notificaciones Pendientes</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Pedidos de productos */}
          <div className='px-3 py-2 text-xs font-semibold text-gray-500'>Pedidos de Productos</div>
          {pendingOrders.length === 0 ? (
            <div className='text-xs text-gray-400 px-4 py-2'>No hay pedidos pendientes</div>
          ) : (
            pendingOrders.map((order: any, index: number) => (
              <DropdownMenuItem
                key={`pedido-${getOrderKey(order, index)}`}
                className='flex flex-col items-start gap-1 cursor-pointer hover:bg-gray-100'
                onClick={() => {
                  const orderId = getOrderId(order);
                  if (orderId) handleOrderClick(String(orderId));
                }}
              >
                <div className='flex justify-between w-full'>
                  <span className='font-semibold text-sm'>{order.garzon}</span>
                  <span className='text-xs text-gray-500'>
                    {formatShortTimeEs(order.fecha_crea)}
                  </span>
                </div>
                <div className='text-xs text-gray-700'>Cliente: {order.cliente}</div>
                {order.nicks && (
                  <div className='text-xs text-gray-600'>Anfitrionas: {order.nicks}</div>
                )}
                <div className='text-xs text-gray-500'>Total: {formatCurrencyCLP(order.total)}</div>
              </DropdownMenuItem>
            ))
          )}

          <DropdownMenuSeparator />

          {/* Solicitudes de servicio */}
          <div className='px-3 py-2 text-xs font-semibold text-gray-500'>
            Solicitudes de Servicio
          </div>
          {pendingServiceRequests.length === 0 ? (
            <div className='text-xs text-gray-400 px-4 py-2'>No hay solicitudes pendientes</div>
          ) : (
            pendingServiceRequests.map((solicitud: any) => (
              <DropdownMenuItem
                key={`solicitud-${solicitud.id_solicitud}`}
                className='flex flex-col items-start gap-1 cursor-pointer hover:bg-gray-100'
                onClick={() => handleServiceClick(solicitud)}
              >
                <div className='flex justify-between w-full'>
                  <span className='font-semibold text-sm'>
                    Habitación: {solicitud.habitacion_nombre || solicitud.habitacion_id}
                  </span>
                  <span className='text-xs text-gray-500'>
                    {formatShortTimeEs(solicitud.fecha_solicitud)}
                  </span>
                </div>
                <div className='text-xs text-gray-700'>
                  Cliente: {solicitud.cliente_nombre || 'Sin cliente registrado'}
                </div>
                <div className='text-xs text-gray-600'>
                  Solicitado por:{' '}
                  {solicitud.solicitado_por_nombre || solicitud.solicitado_por_nick || 'N/A'}
                </div>
                <div className='text-xs text-gray-500'>
                  Total: {formatCurrencyCLP(solicitud.total)}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <audio ref={audioRef} src='/notification.mp3' preload='auto' />

      {modalOpen && selectedOrderId && (
        <OrderDetailModal
          open={modalOpen}
          onClose={handleCloseModal}
          detail={orderDetail}
          isLoading={isDetailLoading}
          error={detailError}
          orderId={selectedOrderId}
          orderCode={selectedOrderCode}
          onOrderStatusChange={refetch}
        />
      )}

      <ServiceRequestModal
        open={serviceModalOpen}
        onOpenChange={setServiceModalOpen}
        solicitud={selectedServiceRequest}
        onProcessed={handleServiceProcessed}
      />
    </>
  );
}
