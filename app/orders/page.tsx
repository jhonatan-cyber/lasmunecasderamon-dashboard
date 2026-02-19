'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, ArrowLeft, AlertCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import dynamic from 'next/dynamic';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { useCashRegisterStatus } from '@/hooks/caja/useCashRegisterStatus';
import { useOrdersSSE } from '@/hooks/orders/useOrdersSSE';

// Lazy load del modal de detalle de pedido
const OrderDetailModal = dynamic(() => import('@/components/orders/OrderDetailModal'), {
  loading: () => (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg p-6'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto'></div>
        <p className='mt-2 text-sm text-gray-600'>Cargando pedido...</p>
      </div>
    </div>
  ),
  ssr: false
});
import { toast } from 'sonner';

interface Order {
  id_pedido: number;
  cliente: string;
  codigo: string;
  garzon: string;
  nicks: string;
  subtotal: number;
  total: number;
  estado: number;
  fecha_crea: string;
}

interface SolicitudServicio {
  id_solicitud: number;
  cliente_id?: number;
  habitacion_id: number;
  precio_servicio: number;
  precio_habitacion: number;
  anfitrionas_ids: number[];
  metodo_pago: string;
  tiempo: number;
  total: number;
  solicitado_por: number;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  motivo_rechazo?: string;
  procesado_por?: number;
  fecha_solicitud: string;
  fecha_procesamiento?: string;
  solicitado_por_nombre: string;
  solicitado_por_nick: string;
  procesado_por_nombre?: string;
  cliente_nombre?: string;
  habitacion_nombre: string;
  habitacion_numero: number;
}

export default function OrdersPage() {
  const router = useRouter();
  const { hasPermission } = useUserPermissions();
  const { hasOpenCaja, loading: cajaLoading } = useCashRegisterStatus();
  const [orders, setOrders] = useState<Order[]>([]);
  const [servicios, setServicios] = useState<SolicitudServicio[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [filteredServicios, setFilteredServicios] = useState<SolicitudServicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingServicios, setLoadingServicios] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchServiciosTerm, setSearchServiciosTerm] = useState('');
  const [activeTab, setActiveTab] = useState('productos');

  const canDelete = hasPermission('orders', 'delete');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrderCode, setSelectedOrderCode] = useState('');
  const [orderDetail, setOrderDetail] = useState<any[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteServicioModalOpen, setDeleteServicioModalOpen] = useState(false);
  const [servicioToDelete, setServicioToDelete] = useState<SolicitudServicio | null>(null);
  const [isDeletingServicio, setIsDeletingServicio] = useState(false);

  // Definir fetchOrders y fetchServicios con useCallback PRIMERO
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/orders');
      const data = await response.json();

      if (data.success) {
        setOrders(data.data);
      }
    } catch (error) {
      console.error('Error al cargar los pedidos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchServicios = useCallback(async () => {
    try {
      setLoadingServicios(true);
      const response = await fetch('/api/solicitudes-servicios?estado=pendiente');
      const data = await response.json();

      if (data.success) {
        const pendientes = (data.data || []).filter(
          (s: SolicitudServicio) => s.estado === 'pendiente'
        );
        setServicios(pendientes);
      }
    } catch (error) {
      console.error('Error al cargar las solicitudes de servicio:', error);
    } finally {
      setLoadingServicios(false);
    }
  }, []);

  const handleOrderUpdate = useCallback((data: { type: string; orderId: number }) => {
    setOrders(prevOrders => {
      if (data.type === 'order-processed' || data.type === 'order-deleted') {
        const updated = prevOrders.filter(order => order.id_pedido !== data.orderId);
        return updated;
      } else if (data.type === 'order-created') {
        fetchOrders();
        return prevOrders;
      }
      return prevOrders;
    });

    if (data.type === 'order-processed' || data.type === 'order-deleted') {
      fetchServicios();
    }
  }, [fetchOrders, fetchServicios]);

  useOrdersSSE(handleOrderUpdate);

  // Cargar datos iniciales
  useEffect(() => {
    fetchOrders();
    fetchServicios();
  }, [fetchOrders, fetchServicios]);

  // Fallback: refetch cada 15 segundos para asegurar actualización en tiempo real
  useEffect(() => {
    console.log('[ORDERS PAGE] ⏰ Iniciando polling cada 15 segundos como fallback');
    const interval = setInterval(() => {
      console.log('[ORDERS PAGE] 🔄 Refetch automático cada 15 segundos (fallback)');
      fetchOrders();
    }, 15000);

    return () => {
      console.log('[ORDERS PAGE] ⏰ Limpiando polling interval');
      clearInterval(interval);
    };
  }, [fetchOrders]);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm]);

  useEffect(() => {
    filterServicios();
  }, [servicios, searchServiciosTerm]);

  useEffect(() => {
    const handleUpdateOrders = (event?: Event) => {
      const detail = (event as CustomEvent)?.detail;
      let orderId: number | null = null;
      let eventType: string | undefined;

      if (detail && typeof detail === 'object') {
        // Verificar si hay tipo directamente en el detalle
        if ('type' in detail && typeof detail.type === 'string') {
          eventType = detail.type;
        }
        
        // Buscar ID del pedido
        if ('orderId' in detail && typeof detail.orderId === 'number') {
          orderId = detail.orderId;
        } else if ('id' in detail && typeof detail.id === 'number') {
          orderId = detail.id;
        } else if (
          eventType === 'order_deleted' &&
          'data' in detail &&
          detail.data &&
          detail.data.id
        ) {
          orderId = detail.data.id;
        }
      }

      console.log('[ORDERS PAGE] 📢 Listener updatePendingOrders EJECUTADO', { eventType, orderId, detail });

      // Manejar eventos específicos
      if (eventType === 'order-created') {
        console.log('[ORDERS PAGE] ✅ NUEVO PEDIDO DETECTADO - Refrescando lista');
        fetchOrders();
        return;
      }

      if (orderId) {
        console.log(`[ORDERS PAGE] 🗑️ Pedido ${orderId} eliminado - Actualizando lista`);
        setOrders(prev => prev.filter(o => o.id_pedido !== orderId));
        setFilteredOrders(prev => prev.filter(o => o.id_pedido !== orderId));
        if (selectedOrderId === orderId) {
          setModalOpen(false);
          setSelectedOrderId(null);
          setSelectedOrderCode('');
          setOrderDetail([]);
        }

        fetchServicios();
        return;
      }

      // Si no hay detalles específicos, refetch completo
      console.log('[ORDERS PAGE] 🔄 Refrescando lista sin detalles específicos');
      fetchOrders();
    };

    const handleUpdateServiceRequests = () => {
      console.log('[ORDERS PAGE] 🔔 Actualizando solicitudes de servicio');
      fetchServicios();
    };

    console.log('[ORDERS PAGE] 📌 Montado - Agregando listeners de eventos');
    window.addEventListener('updatePendingOrders', handleUpdateOrders as EventListener);
    window.addEventListener('updateServiceRequests', handleUpdateServiceRequests);

    return () => {
      console.log('[ORDERS PAGE] 🗑️ Desmontado - Removiendo listeners');
      window.removeEventListener('updatePendingOrders', handleUpdateOrders as EventListener);
      window.removeEventListener('updateServiceRequests', handleUpdateServiceRequests);
    };
  }, [fetchOrders, fetchServicios, selectedOrderId]);

  const hasProcessPermission = () => hasPermission('orders', 'process');

  const fetchOrderDetail = async (orderId: number) => {
    try {
      setIsDetailLoading(true);
      setDetailError(null);
      const response = await fetch(`/api/orders/detail?id=${orderId}`);
      const data = await response.json();

      if (data.success) {
        setOrderDetail(data.data);
      } else {
        setDetailError(data.message || 'Error al cargar los detalles del pedido');
      }
    } catch (error) {
      setDetailError('Error de red al cargar los detalles del pedido');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        order =>
          order.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.garzon.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.nicks.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredOrders(filtered);
  };

  const filterServicios = () => {
    let filtered = servicios.filter(s => s.estado === 'pendiente');

    // Filtrar por búsqueda
    if (searchServiciosTerm) {
      filtered = filtered.filter(
        servicio =>
          servicio.cliente_nombre?.toLowerCase().includes(searchServiciosTerm.toLowerCase()) ||
          servicio.habitacion_nombre.toLowerCase().includes(searchServiciosTerm.toLowerCase()) ||
          servicio.solicitado_por_nombre
            .toLowerCase()
            .includes(searchServiciosTerm.toLowerCase()) ||
          servicio.id_solicitud.toString().includes(searchServiciosTerm)
      );
    }

    setFilteredServicios(filtered);
  };

  const handleServicioClick = (servicio: SolicitudServicio) => {
    window.dispatchEvent(
      new CustomEvent('openServiceRequestModal', { detail: { solicitud: servicio } })
    );
  };

  const handleDeleteServicioClick = (e: React.MouseEvent, servicio: SolicitudServicio) => {
    e.stopPropagation();
    setServicioToDelete(servicio);
    setDeleteServicioModalOpen(true);
  };

  const handleConfirmDeleteServicio = async () => {
    if (!servicioToDelete) return;

    setIsDeletingServicio(true);
    try {
      const response = await fetch(
        `/api/solicitudes-servicios?id=${servicioToDelete.id_solicitud}`,
        {
          method: 'DELETE'
        }
      );
      const data = await response.json();

      if (data.success) {
        toast.success('Solicitud eliminada exitosamente');
        fetchServicios();
        setDeleteServicioModalOpen(false);
        setServicioToDelete(null);
      } else {
        toast.error(data.message || 'Error al eliminar la solicitud');
      }
    } catch (error) {
      toast.error('Error inesperado al eliminar la solicitud');
    } finally {
      setIsDeletingServicio(false);
    }
  };

  const handleCancelDeleteServicio = () => {
    setDeleteServicioModalOpen(false);
    setServicioToDelete(null);
  };

  const getStatusBadge = (estado: number) => {
    switch (estado) {
      case 0:
        return <Badge variant='default'>Completado</Badge>;
      case 1:
        return (
          <Badge className='bg-red-300 text-red-900 font-medium hover:bg-red-300 hover:text-red-900'>
            Pendiente
          </Badge>
        );
      case 2:
        return <Badge variant='destructive'>Cancelado</Badge>;
      default:
        return <Badge variant='outline'>Desconocido</Badge>;
    }
  };

  const getServicioStatusBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return (
          <Badge className='bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'>
            Pendiente
          </Badge>
        );
      case 'aprobada':
        return (
          <Badge className='bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'>
            Aprobada
          </Badge>
        );
      case 'rechazada':
        return (
          <Badge className='bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'>
            Rechazada
          </Badge>
        );
      default:
        return <Badge variant='outline'>Desconocido</Badge>;
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusText = (estado: number) => {
    switch (estado) {
      case 0:
        return 'Completado';
      case 1:
        return 'Pendiente';
      case 2:
        return 'Cancelado';
      default:
        return 'Desconocido';
    }
  };

  const handleOrderClick = (orderId: number, orderCode: string) => {
    if (!hasProcessPermission()) {
      toast.error('No tienes permisos para procesar pedidos');
      return;
    }

    if (!hasOpenCaja) {
      toast.error(
        'No se puede procesar pedidos sin caja abierta. Por favor, abra una caja primero.'
      );
      return;
    }

    setSelectedOrderId(orderId);
    setSelectedOrderCode(orderCode);
    setModalOpen(true);
    fetchOrderDetail(orderId);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedOrderId(null);
    setSelectedOrderCode('');
    setOrderDetail([]);
    setDetailError(null);
  };

  const handleOrderStatusChange = () => {
    fetchOrders();
  };

  const handleDeleteClick = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    setOrderToDelete(order);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/orders/${orderToDelete.id_pedido}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Pedido eliminado exitosamente');

        setOrders(prev => prev.filter(o => o.id_pedido !== orderToDelete!.id_pedido));
        setFilteredOrders(prev => prev.filter(o => o.id_pedido !== orderToDelete!.id_pedido));

        window.dispatchEvent(
          new CustomEvent('updatePendingOrders', {
            detail: { type: 'order-deleted', orderId: orderToDelete!.id_pedido }
          })
        );

        setDeleteModalOpen(false);
        setOrderToDelete(null);
      } else {
        toast.error(data.message || 'Error al eliminar el pedido');
      }
    } catch (error) {
      toast.error('Error inesperado al eliminar el pedido');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalOpen(false);
    setOrderToDelete(null);
  };

  const handleCreateOrder = () => {
    if (!hasOpenCaja) {
      toast.error(
        'No se puede crear un nuevo pedido sin caja abierta. Por favor, abra una caja primero.'
      );
      return;
    }
    router.push('/orders/new');
  };

  if (loading) {
    return (
      <div className='p-6 flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4'></div>
          <p className='text-gray-600'>Cargando órdenes...</p>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard module='orders' action='view'>
      <div className='p-6 space-y-6'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>Gestión de Órdenes</h1>
            <p className='text-gray-600'>Administra todas las órdenes del sistema</p>
          </div>
          <div className='flex gap-2'>
            <PermissionGuard module='orders' action='create' fallback={null}>
              <Button
                onClick={handleCreateOrder}
                disabled={cajaLoading || !hasOpenCaja}
                className={`rounded-full transition-all duration-200 ${
                  hasOpenCaja
                    ? 'bg-black text-white hover:scale-105'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {cajaLoading ? (
                  <>
                    <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2' />
                    Verificando...
                  </>
                ) : hasOpenCaja ? (
                  <>
                    <Plus className='h-4 w-4 mr-2' />
                    Nuevo Pedido
                  </>
                ) : (
                  <>
                    <AlertCircle className='h-4 w-4 mr-2' />
                    Sin Caja
                  </>
                )}
              </Button>
            </PermissionGuard>
          </div>
        </div>

        {/* Mensaje de advertencia cuando no hay caja abierta */}
        {!cajaLoading && hasOpenCaja === false && (
          <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
            <div className='flex items-center'>
              <AlertCircle className='h-5 w-5 text-yellow-600 mr-2' />
              <div>
                <h3 className='text-sm font-medium text-yellow-800'>Caja cerrada</h3>
                <p className='text-sm text-yellow-700 mt-1'>
                  No se pueden crear nuevos pedidos sin una caja abierta. Por favor, abra una caja
                  en el módulo de caja primero.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Estadísticas */}
        {activeTab === 'productos' ? (
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
            <Card>
              <CardContent className='p-4'>
                <div className='text-center'>
                  <p className='text-2xl font-bold text-blue-600'>{orders.length}</p>
                  <p className='text-sm text-gray-600'>Total Órdenes</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='p-4'>
                <div className='text-center'>
                  <p className='text-2xl font-bold text-yellow-600'>
                    {orders.filter(o => o.estado === 1).length}
                  </p>
                  <p className='text-sm text-gray-600'>Pendientes</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='p-4'>
                <div className='text-center'>
                  <p className='text-2xl font-bold text-green-600'>
                    {orders.filter(o => o.estado === 0).length}
                  </p>
                  <p className='text-sm text-gray-600'>Completadas</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='p-4'>
                <div className='text-center'>
                  <p className='text-2xl font-bold text-red-600'>
                    {orders.filter(o => o.estado === 2).length}
                  </p>
                  <p className='text-sm text-gray-600'>Canceladas</p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <Card>
              <CardContent className='p-4'>
                <div className='text-center'>
                  <p className='text-2xl font-bold text-blue-600'>{servicios.length}</p>
                  <p className='text-sm text-gray-600'>Total Solicitudes</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='p-4'>
                <div className='text-center'>
                  <p className='text-2xl font-bold text-yellow-600'>
                    {servicios.filter(s => s.estado === 'pendiente').length}
                  </p>
                  <p className='text-sm text-gray-600'>Pendientes</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='p-4'>
                <div className='text-center'>
                  <p className='text-2xl font-bold text-green-600'>
                    {servicios.filter(s => s.estado === 'aprobada').length}
                  </p>
                  <p className='text-sm text-gray-600'>Aprobadas</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Buscador General */}
        <Card>
          <CardContent className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 mt-2'>
                Buscar
              </label>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
                <Input
                  placeholder={
                    activeTab === 'productos'
                      ? 'Buscar por cliente, código, garzon...'
                      : 'Buscar por cliente, habitación, solicitante...'
                  }
                  value={activeTab === 'productos' ? searchTerm : searchServiciosTerm}
                  onChange={e =>
                    activeTab === 'productos'
                      ? setSearchTerm(e.target.value)
                      : setSearchServiciosTerm(e.target.value)
                  }
                  className='pl-10 rounded-full'
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pestañas */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
          <TabsList className='grid w-full max-w-md mx-auto grid-cols-2 rounded-full bg-gray-100 dark:bg-gray-800 p-1'>
            <TabsTrigger value='productos' className='rounded-full'>
              Pedidos de Productos
            </TabsTrigger>
            <TabsTrigger value='servicios' className='rounded-full'>
              Pedidos de Servicios
            </TabsTrigger>
          </TabsList>

          {/* Tab de Productos */}
          <TabsContent value='productos' className='space-y-6 mt-6'>
            {/* Lista de órdenes */}
            <Card>
              <CardHeader>
                <CardTitle>Órdenes de Productos ({filteredOrders.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className='text-center py-8'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4'></div>
                    <p className='text-gray-600'>Cargando...</p>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className='text-center py-8'>
                    <p className='text-gray-500'>No se encontraron órdenes</p>
                  </div>
                ) : (
                  <div className='space-y-4'>
                    {filteredOrders.map(order => {
                      const canProcess = hasProcessPermission() && hasOpenCaja;
                      return (
                        <div
                          key={order.id_pedido}
                          className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors ${
                            canProcess
                              ? 'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer'
                              : 'cursor-not-allowed opacity-60 pointer-events-none'
                          }`}
                          onClick={
                            canProcess
                              ? () => handleOrderClick(order.id_pedido, order.codigo)
                              : undefined
                          }
                          aria-disabled={!canProcess}
                          role={canProcess ? 'button' : undefined}
                        >
                          <div className='flex items-center justify-between'>
                            <div className='flex-1'>
                              <div className='flex items-center gap-4 mb-2'>
                                <h3 className='font-medium text-gray-900 dark:text-white'>
                                  {order.codigo}
                                </h3>
                                {getStatusBadge(order.estado)}
                                {!hasProcessPermission() && (
                                  <Badge className='bg-gray-100 text-gray-600 text-xs'>
                                    Sin permiso para procesar
                                  </Badge>
                                )}
                                {hasProcessPermission() && !hasOpenCaja && (
                                  <Badge className='bg-yellow-100 text-yellow-700 text-xs'>
                                    Sin caja abierta
                                  </Badge>
                                )}
                              </div>
                              <div className='grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400'>
                                <div>
                                  <span className='font-medium'>Cliente:</span> {order.cliente}
                                </div>
                                <div>
                                  <span className='font-medium'>Garzón:</span> {order.garzon}
                                </div>
                                <div>
                                  <span className='font-medium'>Total:</span> $
                                  {order.total.toLocaleString()}
                                </div>
                              </div>
                              {order.nicks && (
                                <div className='mt-2'>
                                  <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                                    Anfitriona(s):
                                  </span>
                                  <div className='mt-1 flex flex-wrap gap-1'>
                                    {order.nicks.split(',').map((nick, index) => (
                                      <Badge
                                        key={index}
                                        className={`text-xs font-medium ${
                                          index % 6 === 0
                                            ? 'bg-blue-500 text-white'
                                            : index % 6 === 1
                                              ? 'bg-green-500 text-white'
                                              : index % 6 === 2
                                                ? 'bg-purple-500 text-white'
                                                : index % 6 === 3
                                                  ? 'bg-orange-500 text-white'
                                                  : index % 6 === 4
                                                    ? 'bg-pink-500 text-white'
                                                    : 'bg-red-500 text-white'
                                        }`}
                                      >
                                        {nick.trim()}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Botón de eliminar */}
                            {canDelete && (
                              <div className='ml-4'>
                                <Button
                                  size='sm'
                                  variant='outline'
                                  className='rounded-full w-8 h-8 p-0 bg-red-500 text-white hover:bg-red-600 hover:scale-110 transition-all duration-200'
                                  onClick={e => handleDeleteClick(e, order)}
                                  title='Eliminar pedido'
                                >
                                  <Trash2 className='w-3 h-3' />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab de Servicios */}
          <TabsContent value='servicios' className='space-y-6 mt-6'>
            {/* Lista de servicios */}
            <Card>
              <CardHeader>
                <CardTitle>Solicitudes de Servicios ({filteredServicios.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingServicios ? (
                  <div className='text-center py-8'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4'></div>
                    <p className='text-gray-600'>Cargando...</p>
                  </div>
                ) : filteredServicios.length === 0 ? (
                  <div className='text-center py-8'>
                    <p className='text-gray-500'>No se encontraron solicitudes</p>
                  </div>
                ) : (
                  <div className='space-y-4'>
                    {filteredServicios.map(servicio => (
                      <div
                        key={servicio.id_solicitud}
                        className='p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer'
                        onClick={() => handleServicioClick(servicio)}
                      >
                        <div className='flex items-center justify-between'>
                          <div className='flex-1'>
                            <div className='flex items-center gap-4 mb-2'>
                              <h3 className='font-medium text-gray-900 dark:text-white'>
                                Solicitud #{servicio.id_solicitud}
                              </h3>
                              {getServicioStatusBadge(servicio.estado)}
                            </div>
                            <div className='grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400'>
                              <div>
                                <span className='font-medium'>Cliente:</span>{' '}
                                {servicio.cliente_nombre || 'Sin cliente'}
                              </div>
                              <div>
                                <span className='font-medium'>Habitación:</span>{' '}
                                {servicio.habitacion_nombre} #{servicio.habitacion_numero}
                              </div>
                              <div>
                                <span className='font-medium'>Total:</span> $
                                {formatNumber(servicio.total)}
                              </div>
                            </div>
                            <div className='grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400 mt-2'>
                              <div>
                                <span className='font-medium'>Solicitado por:</span>{' '}
                                {servicio.solicitado_por_nombre}
                              </div>
                              <div>
                                <span className='font-medium'>Anfitrionas:</span>{' '}
                                {servicio.anfitrionas_ids.length}
                              </div>
                              <div>
                                <span className='font-medium'>Fecha:</span>{' '}
                                {formatDate(servicio.fecha_solicitud)}
                              </div>
                            </div>
                            {servicio.motivo_rechazo && (
                              <div className='mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg'>
                                <span className='text-sm font-medium text-red-700 dark:text-red-400'>
                                  Motivo de rechazo:
                                </span>
                                <p className='text-sm text-red-600 dark:text-red-300 mt-1'>
                                  {servicio.motivo_rechazo}
                                </p>
                              </div>
                            )}
                          </div>
                          {/* Botón de eliminar */}
                          {canDelete && (
                            <div className='ml-4'>
                              <Button
                                size='sm'
                                variant='outline'
                                className='rounded-full w-8 h-8 p-0 bg-red-500 text-white hover:bg-red-600 hover:scale-110 transition-all duration-200'
                                onClick={e => handleDeleteServicioClick(e, servicio)}
                                title='Eliminar solicitud'
                              >
                                <Trash2 className='w-3 h-3' />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de detalles del pedido */}
      {modalOpen && selectedOrderId && (
        <OrderDetailModal
          open={modalOpen}
          onClose={handleCloseModal}
          detail={orderDetail}
          isLoading={isDetailLoading}
          error={detailError}
          orderId={selectedOrderId}
          orderCode={selectedOrderCode}
          onOrderStatusChange={handleOrderStatusChange}
        />
      )}

      {/* Modal de confirmación de eliminación */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar el pedido{' '}
              <strong>{orderToDelete?.codigo}</strong>?
              <br />
              <br />
              <span className='text-red-600 font-medium'>Esta acción no se puede deshacer.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='flex gap-2 sm:gap-0'>
            <Button
              variant='outline'
              onClick={handleCancelDelete}
              disabled={isDeleting}
              className='rounded-full'
            >
              Cancelar
            </Button>
            <Button
              variant='destructive'
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className='rounded-full'
            >
              {isDeleting ? (
                <>
                  <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2' />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className='w-4 h-4 mr-2' />
                  Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de eliminación de solicitud */}
      <Dialog open={deleteServicioModalOpen} onOpenChange={setDeleteServicioModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar solicitud</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar la solicitud #{servicioToDelete?.id_solicitud}? Esta acción
              no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={handleCancelDeleteServicio}
              disabled={isDeletingServicio}
            >
              Cancelar
            </Button>
            <Button
              variant='destructive'
              onClick={handleConfirmDeleteServicio}
              disabled={isDeletingServicio}
            >
              {isDeletingServicio ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PermissionGuard>
  );
}
