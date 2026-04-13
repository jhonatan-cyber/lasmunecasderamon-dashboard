'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useOrdersList, Order, SolicitudServicio } from '@/hooks/orders/useOrdersList';
import { useOrderDetail } from '@/hooks/orders/useOrderDetail';
import { ReportSkeleton } from '@/components/shared/Skeletons';
import { toast } from 'sonner';

// Componentes Refactorizados
import { OrdersHeader } from '@/components/orders/list/OrdersHeader';
import { OrdersStats } from '@/components/orders/list/OrdersStats';
import { OrderCard } from '@/components/orders/list/OrderCard';
import { ServiceRequestCard } from '@/components/orders/list/ServiceRequestCard';

const OrderDetailModal = dynamic(() => import('@/components/orders/OrderDetailModal'), {
  loading: () => null,
  ssr: false
});

export default function OrdersPage() {
  const router = useRouter();
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
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrderCode, setSelectedOrderCode] = useState('');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [deleteServicioModalOpen, setDeleteServicioModalOpen] = useState(false);
  const [servicioToDelete, setServicioToDelete] = useState<SolicitudServicio | null>(null);
  const [isDeletingServicio, setIsDeletingServicio] = useState(false);

  const canDelete = hasPermission('orders', 'delete');
  const canProcess = hasPermission('orders', 'process') || hasPermission('pedidos', 'ventas');

  const handleOrderClick = (id: number, code: string) => {
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

  if (loadingOrders && orders.length === 0) return <ReportSkeleton />;

  return (
    <PermissionGuard module='orders' action='view'>
      <div className='p-6 max-w-[1600px] mx-auto space-y-6'>
        <OrdersHeader
          hasOpenCaja={hasOpenCaja}
          cajaLoading={cajaLoading}
          onCreateOrder={() => router.push('/orders/new')}
        />

        <OrdersStats activeTab={activeTab} orders={orders} servicios={servicios} />

        <Card className='border-none bg-gray-50/30'>
          <CardContent className='p-4'>
            <div className='relative'>
              <Search className='absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
              <Input
                placeholder={
                  activeTab === 'productos'
                    ? 'Buscar cliente, código, garzón...'
                    : 'Buscar cliente, habitación...'
                }
                value={activeTab === 'productos' ? searchTerm : searchServiciosTerm}
                onChange={e =>
                  activeTab === 'productos'
                    ? setSearchTerm(e.target.value)
                    : setSearchServiciosTerm(e.target.value)
                }
                className='pl-12 h-12 rounded-full border-gray-200 focus:ring-2 focus:ring-black transition-all bg-white'
              />
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
          <TabsList className='grid w-full max-w-md mx-auto grid-cols-2 rounded-full bg-gray-100 p-1 mb-8'>
            <TabsTrigger
              value='productos'
              className='rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm'
            >
              Productos
            </TabsTrigger>
            <TabsTrigger
              value='servicios'
              className='rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm'
            >
              Servicios
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value='productos'
            className='space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300'
          >
            {filteredOrders.length === 0 ? (
              <div className='text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200'>
                <p className='text-gray-400 font-medium'>No se encontraron órdenes de productos</p>
              </div>
            ) : (
              <div className='grid grid-cols-1 xl:grid-cols-2 gap-4'>
                {filteredOrders.map(order => (
                  <OrderCard
                    key={order.id_pedido}
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
              <div className='text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200'>
                <p className='text-gray-400 font-medium'>
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
                      window.dispatchEvent(
                        new CustomEvent('openServiceRequestModal', { detail: { solicitud: s } })
                      )
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

      {/* Dialogs de eliminación (Product Order) */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className='rounded-2xl'>
          <DialogHeader>
            <DialogTitle>¿Confirmar eliminación?</DialogTitle>
            <DialogDescription>
              Eliminarás el pedido {orderToDelete?.codigo}. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='gap-2'>
            <Button
              variant='outline'
              onClick={() => setDeleteModalOpen(false)}
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
              {isDeleting ? 'Eliminando...' : 'Eliminar Pedido'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogs de eliminación (Service) */}
      <Dialog open={deleteServicioModalOpen} onOpenChange={setDeleteServicioModalOpen}>
        <DialogContent className='rounded-2xl'>
          <DialogHeader>
            <DialogTitle>¿Confirmar eliminación?</DialogTitle>
            <DialogDescription>
              Eliminarás la solicitud de servicio #{servicioToDelete?.id_solicitud}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='gap-2'>
            <Button
              variant='outline'
              onClick={() => setDeleteServicioModalOpen(false)}
              className='rounded-full'
            >
              Cancelar
            </Button>
            <Button
              variant='destructive'
              onClick={handleConfirmDeleteServicio}
              disabled={isDeletingServicio}
              className='rounded-full'
            >
              {isDeletingServicio ? 'Eliminando...' : 'Eliminar Solicitud'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PermissionGuard>
  );
}
