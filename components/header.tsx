'use client';

import { Bell, User, ChevronDown, Menu, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { showSuccessToast, showErrorToast } from '@/lib/toastUtils';
import { useRouter, usePathname } from 'next/navigation';
import useOrders from '@/hooks/servicios/useOrders';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useEffect, useState, useRef } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import { useUserImage } from '@/contexts/UserImageContext';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { useCashRegisterStatus } from '@/hooks/caja/useCashRegisterStatus';
import { useNotificationsContext } from '@/contexts/NotificationsContext';
import { useAnfitrionas } from '@/hooks/personal/useAnfitrionas';
import { useTimer } from '@/contexts/TimerContext';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { CodigoVerificacionHeader } from '@/components/dashboard/CodigoVerificacionHeader';
import ThemeSwitcher from '@/components/ui/ThemeSwitcher';

// Lazy load del modal de detalle de pedido
const OrderDetailModal = dynamic(
  () => import('@/components/orders/OrderDetailModal'),
  {
    loading: () => null, // No mostrar loading en el header para no interferir con la UI
    ssr: false
  }
);

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { orders, refetch, orderDetail, fetchOrderDetail, isDetailLoading, detailError, setOrders } =
    useOrders();
  const { user, loading: userLoading } = useCurrentUser();
  const { toggleSidebar, isCollapsed, toggleCollapse } = useSidebar();
  const { imageVersion } = useUserImage();
  const { hasPermission } = useUserPermissions();
  const { hasOpenCaja } = useCashRegisterStatus();
  const [showDropdown, setShowDropdown] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrderCode, setSelectedOrderCode] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [pendingServiceRequests, setPendingServiceRequests] = useState<any[]>([]);
  const [selectedServiceRequest, setSelectedServiceRequest] = useState<any | null>(null);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [serviceProcessing, setServiceProcessing] = useState(false);
  const { anfitrionas } = useAnfitrionas(false);
  const { startTimer } = useTimer();
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [isRoomAvailable, setIsRoomAvailable] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState<number | ''>('');

  // Obtener notificaciones totales (pedidos + solicitudes de servicio)
  const { pendingOrdersCount = 0, pendingServiceRequestsCount = 0 } = useNotificationsContext();
  const totalNotifications = pendingOrdersCount + pendingServiceRequestsCount;

  // Verificar si el usuario es anfitriona, garzón o cajero
  const isAnfitriona = user?.role?.toLowerCase() === 'anfitriona';
  const isGarzon = user?.role?.toLowerCase() === 'garzon';
  const isCajero = user?.role?.toLowerCase() === 'cajero';
  const isAdmin = user?.role?.toLowerCase() === 'administrador';



  // Habilitar audio cuando el usuario interactúe
  const enableAudio = () => {
    if (audioRef.current) {
      audioRef.current
        .play()
        .then(() => {
          audioRef.current!.pause();
          audioRef.current!.currentTime = 0;
          setAudioEnabled(true);
        })
        .catch(error => {
          return;
        });
    }
  };

  // Habilitar audio en la primera interacción del usuario
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

  async function handleLogout() {
    try {
      const res = await fetch('/api/logout', { method: 'POST' });
      if (res.ok) {
        showSuccessToast('Sesión cerrada exitosamente');
        setTimeout(() => {
          router.replace('/login');
        }, 3000);
      } else {
        showErrorToast('No se pudo cerrar la sesión');
      }
    } catch {
      showErrorToast('Error de red al cerrar sesión');
    }
  }

  const pendingOrders = orders.filter((o: any) => String(o.estado) === '1');

  const handleOrderClick = (orderId: number) => {
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

    const order = orders.find((o: any) => o.id_pedido === orderId);
    setSelectedOrderId(orderId);
    setSelectedOrderCode(order?.codigo || '');
    setModalOpen(true);
    setShowDropdown(false);
    fetchOrderDetail(orderId);
  };
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
      const order = orders.find((o: any) => o.id_pedido === orderId);
      
      setSelectedOrderId(orderId);
      setSelectedOrderCode(codigo || order?.codigo || '');
      setModalOpen(true);
      fetchOrderDetail(orderId);
    };


    window.addEventListener('openOrderModal', handleOpenOrderModal as EventListener);

    return () => {
      window.removeEventListener('openOrderModal', handleOpenOrderModal as EventListener);
    };
  }, [fetchOrderDetail, orders, hasOpenCaja, hasPermission]);


  useEffect(() => {
    const handleOpenServiceRequestModal = async (event: CustomEvent) => {
      const solicitud = (event.detail && event.detail.solicitud) || event.detail;
      if (!solicitud) return;
      if (anfitrionas.length === 0) {
        setTimeout(() => {

          setSelectedServiceRequest(solicitud);
          setRejectReason('');
          setServiceModalOpen(true);
          setShowDropdown(false);
          loadRoomAvailability(solicitud);
        }, 1000);
        return;
      }

      setSelectedServiceRequest(solicitud);
      setRejectReason('');
      setServiceModalOpen(true);
      setShowDropdown(false);
      await loadRoomAvailability(solicitud);
    };

    window.addEventListener(
      'openServiceRequestModal',
      handleOpenServiceRequestModal as unknown as EventListener
    );

    return () => {
      window.removeEventListener(
        'openServiceRequestModal',
        handleOpenServiceRequestModal as unknown as EventListener
      );
    };
  }, [anfitrionas]);

  useEffect(() => {
    const handleUpdatePendingOrders = (event?: CustomEvent) => {
      if (event && event.detail) {
        const { type, orderId } = event.detail;
        if (type === 'order-processed' || type === 'order-deleted') {
          setOrders((prevOrders: any[]) => {
            const updated = prevOrders.filter((o: any) => o.id_pedido !== orderId);
            return updated;
          });
        } else if (type === 'order-created') {
          refetch();
        }
      } else {
        refetch();
      }
    };

    window.addEventListener('updatePendingOrders', handleUpdatePendingOrders as EventListener);

    return () => {
      window.removeEventListener('updatePendingOrders', handleUpdatePendingOrders as EventListener);
    };
  }, [refetch, setOrders]);

  useEffect(() => {
    const handleCloseOrderModal = (event: CustomEvent) => {
      const { orderId: processedOrderId } = event.detail;
      if (modalOpen && selectedOrderId === processedOrderId) {
        handleCloseModal();
      }
    };

    window.addEventListener('closeOrderModal', handleCloseOrderModal as EventListener);

    return () => {
      window.removeEventListener('closeOrderModal', handleCloseOrderModal as EventListener);
    };
  }, [modalOpen, selectedOrderId]);

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedOrderId(null);
    setSelectedOrderCode('');
  };

  const fetchPendingServiceRequests = async () => {
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
  };

  useEffect(() => {
    fetchPendingServiceRequests();
  }, []);

  useEffect(() => {
    const handleUpdateServiceRequests = () => {
      fetchPendingServiceRequests();
    };

    window.addEventListener('updateServiceRequests', handleUpdateServiceRequests);

    return () => {
      window.removeEventListener('updateServiceRequests', handleUpdateServiceRequests);
    };
  }, []);

  const getAnfitrionasNicks = (ids: any) => {
    let finalIds = ids;

    // Parsear si viene como string (JSON o CSV)
    if (typeof ids === 'string') {
      try {
        finalIds = JSON.parse(ids);
      } catch (e) {
        // Fallback para CSV
        finalIds = ids.split(',').map(id => parseInt(id.trim())).filter(Boolean);
      }
    }

    if (!finalIds || !Array.isArray(finalIds) || finalIds.length === 0) return 'N/A';

    const nickMap = new Map<number, string>();
    anfitrionas.forEach((a: any) => {
      const id = a.id_usuario || a.id;
      if (id) {
        nickMap.set(Number(id), a.nick || a.nombre || a.name || `#${id}`);
      }
    });

    const nicks = finalIds.map((id: number) => nickMap.get(Number(id)) || `#${id}`);
    const result = nicks.length > 0 ? nicks.join(', ') : 'N/A';

    return result;
  };

  const calculateIVA = (solicitud: any) => {
    let anfitrionasIds = solicitud.anfitrionas_ids;

    // Parsear si viene como string JSON
    if (typeof anfitrionasIds === 'string') {
      try {
        anfitrionasIds = JSON.parse(anfitrionasIds);

      } catch {

        anfitrionasIds = [];
      }
    }

    const metodoPago = (solicitud?.metodo_pago || '').toString().toLowerCase();
    if (metodoPago !== 'tarjeta') {

      return 0;
    }

    const numAnfitrionas = Array.isArray(anfitrionasIds)
      ? anfitrionasIds.length
      : 0;
    const tiempo = Number(solicitud.tiempo || 0);
    const multiplicador = tiempo === 60 ? 2 : 1;
    const precioServicio = (solicitud.precio_servicio || 0) * multiplicador;
    const precioHabitacion = (solicitud.precio_habitacion || 0) * multiplicador;

    const nuevoSubTotal = precioServicio * numAnfitrionas;
    const precioHabitacionTotal = precioHabitacion * numAnfitrionas;
    let nuevoIVA = Math.floor(nuevoSubTotal * 0.2);
    const nuevoTotal = nuevoSubTotal + precioHabitacionTotal + nuevoIVA;
    const totalRedondeado = Math.ceil(nuevoTotal / 5000) * 5000;
    const excedente = totalRedondeado - nuevoTotal;
    nuevoIVA = nuevoIVA + excedente;



    return nuevoIVA;
  };

  const loadRoomAvailability = async (solicitud: any) => {
    try {
      const response = await fetch('/api/rooms?status=1');
      const data = await response.json();
      if (data.success) {
        const rooms = data.data || [];
        setAvailableRooms(rooms);
        const currentRoomId = solicitud?.habitacion_id;
        const currentIsAvailable = rooms.some(
          (r: any) => (r.id_habitacion || r.id) === currentRoomId
        );
        setIsRoomAvailable(currentIsAvailable);
        setSelectedRoomId(currentIsAvailable ? currentRoomId : '');
      } else {
        setAvailableRooms([]);
        setIsRoomAvailable(true);
        setSelectedRoomId(solicitud?.habitacion_id || '');
      }
    } catch {
      setAvailableRooms([]);
      setIsRoomAvailable(true);
      setSelectedRoomId(solicitud?.habitacion_id || '');
    }
  };

  const handleServiceClick = async (solicitud: any) => {
    setSelectedServiceRequest(solicitud);
    setRejectReason('');
    setServiceModalOpen(true);
    setShowDropdown(false);
    await loadRoomAvailability(solicitud);
  };

  const handleApproveServiceRequest = async () => {
    if (!selectedServiceRequest) return;
    if (!isRoomAvailable && !selectedRoomId) {
      showErrorToast('Selecciona una habitación disponible');
      return;
    }
    setServiceProcessing(true);
    try {
      const habitacionIdFinal =
        (isRoomAvailable ? selectedServiceRequest.habitacion_id : selectedRoomId) ||
        selectedServiceRequest.habitacion_id;

      const url = `/api/solicitudes-servicios/${selectedServiceRequest.id_solicitud}/aprobar`;

      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitacion_id: habitacionIdFinal })
      });
      const data = await response.json();

      if (data.success && data.data) {
        const {
          servicio_id,
          codigo,
          habitacion_nombre,
          cliente_nombre,
          anfitrionas,
          tiempo
        } = data.data;

        const habitacionId = habitacionIdFinal || selectedServiceRequest.habitacion_id;

        const solicitante =
          selectedServiceRequest.solicitado_por_nombre ||
          selectedServiceRequest.solicitado_por_nick ||
          undefined;

        // Iniciar el temporizador inmediatamente con la data del servidor
        if (servicio_id && habitacionId && tiempo > 0) {
          startTimer(
            servicio_id,
            habitacionId,
            habitacion_nombre,
            tiempo,
            codigo,
            cliente_nombre,
            anfitrionas,
            'servicio',
            solicitante
          );
        }

        showSuccessToast('Solicitud aprobada exitosamente');
        setServiceModalOpen(false);
        setSelectedServiceRequest(null);

        // Actualizaciones en segundo plano
        fetchPendingServiceRequests();
        const updateEvent = new CustomEvent('updateServiceRequests');
        window.dispatchEvent(updateEvent);
      } else {
        showErrorToast(data.message || 'Error al aprobar solicitud');
      }
    } catch (error) {

      showErrorToast('Error al aprobar solicitud');
    } finally {
      setServiceProcessing(false);
    }
  };

  const handleRejectServiceRequest = async () => {
    if (!selectedServiceRequest) return;


    if (!rejectReason.trim()) {
      showErrorToast('El motivo de rechazo es requerido');
      return;
    }

    setServiceProcessing(true);
    try {
      const url = `/api/solicitudes-servicios/${selectedServiceRequest.id_solicitud}/rechazar`;

      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo_rechazo: rejectReason })
      });
      const data = await response.json();
      if (data.success) {
        showSuccessToast('Solicitud rechazada exitosamente');
        setServiceModalOpen(false);
        setSelectedServiceRequest(null);
        setRejectReason('');
        fetchPendingServiceRequests();
        const updateEvent = new CustomEvent('updateServiceRequests');
        window.dispatchEvent(updateEvent);
      } else {
        showErrorToast(data.message || 'Error al rechazar solicitud');
      }
    } catch (error) {
      showErrorToast('Error al rechazar solicitud');
    } finally {
      setServiceProcessing(false);
    }
  };

  return (
    <header className='h-16 bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between px-4 sm:px-6 floating-header'>
      <div className='flex items-center gap-4 flex-1'>
        {/* Botón hamburguesa para móviles */}
        <Button
          variant='ghost'
          size='icon'
          onClick={toggleSidebar}
          className='lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-neutral-800'
        >
          <Menu className='h-5 w-5' />
        </Button>

        {/* Botón de colapsar/expandir sidebar para desktop */}
        <Button
          variant='ghost'
          size='icon'
          onClick={toggleCollapse}
          className='hidden lg:flex p-2 hover:bg-gray-100 dark:hover:bg-neutral-800'
          title={isCollapsed ? 'Expandir sidebar' : 'Contraer sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className='h-5 w-5 text-gray-500 dark:text-neutral-400' />
          ) : (
            <ChevronLeft className='h-5 w-5 text-gray-500 dark:text-neutral-400' />
          )}
        </Button>

        {/* Espacio para el logo o título */}
      </div>

      <div className='flex items-center gap-2 sm:gap-4'>
        <ThemeSwitcher />
        <CodigoVerificacionHeader userRole={user?.role} />

        {/* Ocultar campanita de notificaciones para anfitrionas */}
        {!isAnfitriona && !isGarzon && (
          <DropdownMenu open={showDropdown} onOpenChange={setShowDropdown}>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='icon' className='relative'>
                <Bell
                  className={`h-5 w-5 bell-icon ${totalNotifications > 0 ? 'bell-ring' : ''}`}
                />
                {totalNotifications > 0 && (
                  <span className={`absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center badge-blink`}>
                    {totalNotifications}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-80 max-h-96 overflow-y-auto'>
              <DropdownMenuLabel>Notificaciones Pendientes</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Pedidos de productos */}
              <div className='px-3 py-2 text-xs font-semibold text-gray-500'>
                Pedidos de Productos
              </div>
              {pendingOrders.length === 0 ? (
                <div className='text-xs text-gray-400 px-4 py-2'>No hay pedidos pendientes</div>
              ) : (
                pendingOrders.map((order: any) => (
                  <DropdownMenuItem
                    key={`pedido-${order.id_pedido}`}
                    className='flex flex-col items-start gap-1 cursor-pointer hover:bg-gray-100'
                    onClick={() => handleOrderClick(order.id_pedido)}
                  >
                    <div className='flex justify-between w-full'>
                      <span className='font-semibold text-sm'>{order.garzon}</span>
                      <span className='text-xs text-gray-500'>
                        {order.fecha_crea ? order.fecha_crea.slice(11, 16) : ''}
                      </span>
                    </div>
                    <div className='text-xs text-gray-700'>Cliente: {order.cliente}</div>
                    {order.nicks && (
                      <div className='text-xs text-gray-600'>Anfitrionas: {order.nicks}</div>
                    )}
                    <div className='text-xs text-gray-500'>
                      Total: ${order.total?.toLocaleString('es-CL')}
                    </div>
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
                        {solicitud.fecha_solicitud ? solicitud.fecha_solicitud.slice(11, 16) : ''}
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
                      Total: ${solicitud.total?.toLocaleString('es-CL')}
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
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

        <Dialog open={serviceModalOpen} onOpenChange={setServiceModalOpen}>
          <DialogContent className='max-w-xl'>
            <DialogHeader>
              <DialogTitle>
                Solicitud de Servicio #{selectedServiceRequest?.id_solicitud}
              </DialogTitle>
            </DialogHeader>

            {selectedServiceRequest && (
              <div className='space-y-3 text-sm'>
                <div>
                  <span className='font-medium'>Anfitrionas:</span>{' '}
                  {getAnfitrionasNicks(selectedServiceRequest.anfitrionas_ids)}
                </div>
                <div>
                  <span className='font-medium'>Habitación:</span>{' '}
                  {selectedServiceRequest.habitacion_nombre || selectedServiceRequest.habitacion_id}
                </div>
                {!isRoomAvailable && (
                  <div className='space-y-2'>
                    <div className='text-sm text-red-600'>
                      La habitación está ocupada. Selecciona una disponible:
                    </div>
                    <Select
                      value={selectedRoomId ? String(selectedRoomId) : ''}
                      onValueChange={value => setSelectedRoomId(value ? Number(value) : '')}
                    >
                      <SelectTrigger className='bg-white dark:bg-[#2a2a2a] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-full'>
                        <SelectValue placeholder='Seleccionar habitación' />
                      </SelectTrigger>
                      <SelectContent className='bg-white dark:bg-[#2a2a2a] border-gray-300 dark:border-gray-700'>
                        {availableRooms.map((room: any) => (
                          <SelectItem
                            key={room.id_habitacion || room.id}
                            value={String(room.id_habitacion || room.id)}
                            className='text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                          >
                            {room.nombre || room.name} - $
                            {Number(room.precio || room.price || 0).toLocaleString('es-CL')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <span className='font-medium'>Tiempo:</span> {selectedServiceRequest.tiempo} min
                </div>
                <div>
                  <span className='font-medium'>Total:</span> $
                  {Math.round(selectedServiceRequest.total).toLocaleString('es-CL')}
                </div>
                <div>
                  <span className='font-medium'>Garzón:</span>{' '}
                  {selectedServiceRequest.solicitado_por_nombre ||
                    selectedServiceRequest.solicitado_por_nick ||
                    'N/A'}
                </div>
                <div>
                  <span className='font-medium'>Método de pago:</span>{' '}
                  {selectedServiceRequest.metodo_pago}
                </div>
                <div>
                  <span className='font-medium'>IVA:</span> $
                  {(() => {
                    const ivaCalculado = calculateIVA(selectedServiceRequest);

                    return Math.round(ivaCalculado).toLocaleString('es-CL');
                  })()}
                </div>
              </div>
            )}

            <div className='mt-4 space-y-2'>
              <Label>Motivo de rechazo</Label>
              <Textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder='Escribe el motivo si vas a rechazar'
                rows={3}
              />
            </div>

            <div className='mt-4 flex justify-center gap-2'>
              <Button
                className='bg-red-600 hover:bg-red-700 rounded-full'
                onClick={handleRejectServiceRequest}
                disabled={serviceProcessing}
              >
                Rechazar
              </Button>
              <Button
                className='bg-green-600 hover:bg-green-700 rounded-full'
                onClick={handleApproveServiceRequest}
                disabled={serviceProcessing}
              >
                Aprobar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {!userLoading && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' className='flex items-center gap-2 px-2 sm:px-3'>
                <Avatar className='h-8 w-8'>
                  {user?.foto && user.foto !== '' ? (
                    <img
                      src={`/img/users/${user.foto}?v=${imageVersion}`}
                      alt={user ? `${user.name} ${user.lastName}` : 'Usuario'}
                      className="w-full h-full object-cover rounded-full"
                      onError={(e) => {

                        e.currentTarget.src = '/img/users/default.png';
                      }}

                    />
                  ) : (
                    <AvatarImage src="/img/users/default.png" alt="Usuario" />
                  )}
                  <AvatarFallback>
                    {user ? `${user.name?.[0] || ''}${user.lastName?.[0] || ''}` : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className='text-left hidden sm:block'>
                  <p className='text-sm font-medium'>
                    {user ? `${user.name} ${user.lastName}` : 'Usuario'}
                  </p>
                  <p className='text-xs text-gray-500'>{user?.role || 'Sin rol'}</p>
                </div>
                <ChevronDown className='h-4 w-4 hidden sm:block' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-56'>
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')}>
                <User className='mr-2 h-4 w-4' />
                Perfil
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => router.push('/configuracion')}>
                  <Settings className='mr-2 h-4 w-4' />
                  Configuración
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className='text-red-600' onClick={handleLogout}>
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
