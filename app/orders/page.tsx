'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import dynamic from 'next/dynamic';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { useCashRegisterStatus } from '@/hooks/caja/useCashRegisterStatus';
import { useOrdersList, Order, SolicitudServicio } from '@/hooks/orders/useOrdersList';
import { useOrderDetail } from '@/hooks/orders/useOrderDetail';
import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { toast } from 'sonner';
import { appEventBus } from '@/lib/utils/eventBus';

import {
  OrdersHeader,
  OrdersStats,
  AdminOrdersFilters,
  OrderCard,
  ServiceRequestCard
} from '@/components/orders/list';

const OrderDetailModal = dynamic(
  () => import('@/components/orders').then(mod => mod.OrderDetailModal),
  {
    loading: () => null,
    ssr: false
  }
);

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = useUserPermissions();
  const { hasOpenCaja, loading: cajaLoading } = useCashRegisterStatus();

  const {
    loadingOrders,
    loadingServicios,
    searchTerm,
    setSearchTerm,
    searchServiciosTerm,
    setSearchServiciosTerm,
    filteredOrders,
    filteredServicios,
    deleteOrder,
    deleteServicio,
    orders,
    servicios
  } = useOrdersList();

  const [activeTab, setActiveTab] = useState('productos');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrderCode, setSelectedOrderCode] = useState('');
  const [sortBy, setSortBy] = useState('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const idParam = searchParams.get('id');
    if (idParam && orders.length > 0) {
      const foundOrder = orders.find(o => o.id_pedido === idParam || o.id === idParam);
      if (foundOrder) {
        setSelectedOrderId(foundOrder.id_pedido || foundOrder.id);
        setSelectedOrderCode(foundOrder.codigo);
        setModalOpen(true);

        router.replace('/orders', { scroll: false });
      }
    }
  }, [searchParams, orders, router]);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [deleteServicioModalOpen, setDeleteServicioModalOpen] = useState(false);
  const [servicioToDelete, setServicioToDelete] = useState<SolicitudServicio | null>(null);
  const [isDeletingServicio, setIsDeletingServicio] = useState(false);

  const canDelete = hasPermission('orders', 'delete');
  const canProcess = hasPermission('orders', 'process') || hasPermission('pedidos', 'ventas');

  const handleOrderClick = (id: string, code: string) => {
    if (!canProcess) {
      toast.error('No tienes permisos para interactuar con pedidos');
      return;
    }
    setSelectedOrderId(id);
    setSelectedOrderCode(code);
    setModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    setOrderToDelete(order);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    const success = await deleteOrder(orderToDelete.id_pedido);
    if (success) {
      setDeleteModalOpen(false);
      setOrderToDelete(null);
    }
    setIsDeleting(false);
  };

  const handleDeleteServicioClick = (e: React.MouseEvent, s: SolicitudServicio) => {
    e.stopPropagation();
    setServicioToDelete(s);
    setDeleteServicioModalOpen(true);
  };

  const handleConfirmDeleteServicio = async () => {
    if (!servicioToDelete) return;
    setIsDeletingServicio(true);
    const success = await deleteServicio(servicioToDelete.id_solicitud);
    if (success) {
      setDeleteServicioModalOpen(false);
      setServicioToDelete(null);
    }
    setIsDeletingServicio(false);
  };

  const {
    detail: orderDetail,
    loading: loadingDetail,
    error: orderDetailError
  } = useOrderDetail(selectedOrderId);

  return (
    <PermissionGuard module='orders' action='view'>
      <BoneyardSkeleton name="orders-main" loading={loadingOrders && orders.length === 0}>
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <OrdersHeader
          hasOpenCaja={hasOpenCaja}
          cajaLoading={cajaLoading}
          onCreateOrder={() => router.push('/orders/new')}
        />

        <OrdersStats activeTab={activeTab} orders={orders} servicios={servicios} />

        <AdminOrdersFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          searchServiciosTerm={searchServiciosTerm}
          setSearchServiciosTerm={setSearchServiciosTerm}
          activeTab={activeTab}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          onClearFilters={() => {
            setSearchTerm('');
            setSearchServiciosTerm('');
            setSortBy('total');
            setSortOrder('desc');
          }}
          rowsPerPage={10}
          setRowsPerPage={() => {}}
          setPage={() => {}}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
          <TabsList className='grid w-full max-w-md mx-auto grid-cols-2 rounded-full bg-gray-100 p-1 mb-8 dark:bg-zinc-900 dark:border dark:border-zinc-800'>
            <TabsTrigger
              value='productos'
              className='rounded-full text-gray-600 dark:text-zinc-400 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs dark:data-[state=active]:bg-zinc-100 dark:data-[state=active]:text-zinc-900'
            >
              Productos
            </TabsTrigger>
            <TabsTrigger
              value='servicios'
              className='rounded-full text-gray-600 dark:text-zinc-400 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs dark:data-[state=active]:bg-zinc-100 dark:data-[state=active]:text-zinc-900'
            >
              Servicios
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value='productos'
            className='space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300'
          >
            {filteredOrders.length === 0 ? (
              <div className='text-center py-20 rounded-2xl border border-dashed border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/70'>
                <p className='font-medium text-gray-400 dark:text-zinc-500'>
                  No se encontraron ??rdenes de productos
                </p>
              </div>
            ) : (
              <div className='grid grid-cols-1 xl:grid-cols-2 gap-4'>
                {filteredOrders.map(order => (
                  <OrderCard
                    key={order.id_pedido || order.id}
                    order={order}
                    canDelete={canDelete}
                    canProcess={canProcess}
                    hasOpenCaja={hasOpenCaja}
                    onOrderClick={handleOrderClick}
                    onDeleteClick={handleDeleteClick}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent
            value='servicios'
            className='space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300'
          >
            {filteredServicios.length === 0 ? (
              <div className='text-center py-20 rounded-2xl border border-dashed border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/70'>
                <p className='font-medium text-gray-400 dark:text-zinc-500'>
                  No hay solicitudes de servicio pendientes
                </p>
              </div>
            ) : (
              <div className='grid grid-cols-1 gap-4'>
                {filteredServicios.map(servicio => (
                  <ServiceRequestCard
                    key={servicio.id_solicitud}
                    servicio={servicio}
                    canDelete={canDelete}
                    onServicioClick={s =>
                      appEventBus.emit('openServiceRequestModal', { solicitud: s })
                    }
                    onDeleteClick={handleDeleteServicioClick}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {modalOpen && selectedOrderId && (
        <OrderDetailModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          orderId={selectedOrderId}
          orderCode={selectedOrderCode}
          detail={orderDetail}
          isLoading={loadingDetail}
          error={orderDetailError}
          onOrderStatusChange={() => {}}
        />
      )}

      {}
      <ConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title='Confirmar eliminación'
        message={`Eliminarás el pedido ${orderToDelete?.codigo}. Esta acción no se puede deshacer.`}
        confirmText={isDeleting ? 'Eliminando...' : 'Eliminar Pedido'}
        type='warning'
        confirmVariant='destructive'
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
      <ConfirmModal
        open={deleteServicioModalOpen}
        onOpenChange={setDeleteServicioModalOpen}
        title='Confirmar eliminación'
        message={`Eliminarás la solicitud de servicio #${servicioToDelete?.id_solicitud}.`}
        confirmText={isDeletingServicio ? 'Eliminando...' : 'Eliminar Solicitud'}
        type='warning'
        confirmVariant='destructive'
        onConfirm={handleConfirmDeleteServicio}
        isLoading={isDeletingServicio}
      />
      </BoneyardSkeleton>
    </PermissionGuard>
  );
}
