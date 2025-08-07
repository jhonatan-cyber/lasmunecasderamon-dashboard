'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import useOrders from '@/hooks/useOrders';
import { useRouter } from 'next/navigation';
import OrderTable from '@/components/orders/OrderTable';
import OrderDetailModal from '@/components/orders/OrderDetailModal';
import { OrderFilters } from '@/components/orders/OrderFilters';
import Paginate from '@/components/ui/paginate';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';


export default function Orders() {
  const router = useRouter();
  const { orders, isLoading, error, refetch, orderDetail, fetchOrderDetail, isDetailLoading, detailError } = useOrders();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrderCode, setSelectedOrderCode] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Función para limpiar filtros
  const handleClearFilters = () => {
    setSearchTerm('');
    setPageSize(5);
    setPage(1);
  };



  // Resetear página cuando cambien los filtros
  useEffect(() => {
    setPage(1);
  }, [searchTerm, pageSize]);

  // Filtrado
  const filteredOrders = orders.filter((order: any) => {
    const matchesSearch =
      order.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.garzon && order.garzon.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.nicks && order.nicks.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.cliente && order.cliente.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesSearch;
  });

  // Paginación
  const getPaginatedOrders = () => {
    const start = (page - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  };

  const paginatedOrders = getPaginatedOrders();
  const totalPages = Math.ceil(filteredOrders.length / pageSize);

  const handleOpenDetail = (order: any) => {
    setSelectedOrderId(order.id_pedido);
    setSelectedOrderCode(order.codigo);
    setModalOpen(true);
    fetchOrderDetail(order.id_pedido);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedOrderId(null);
    setSelectedOrderCode("");
  };

  return (
    <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6'>
        <div>
          <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold'>Pedidos</h1>
          <p className='text-sm sm:text-base text-gray-600'>Gestiona todos los pedidos del club</p>
        </div>

        <Button
          variant='outline'
          size='sm'
          className='rounded-full bg-black text-white hover:scale-105 transition-all duration-200 text-sm sm:text-base px-4 sm:px-6 py-2 w-full sm:w-auto'
          onClick={() => router.push('/orders/new')}
          type='button'
        >
          <FontAwesomeIcon icon={faPlus} className='w-3 h-3 sm:w-4 sm:h-4 mr-1' />
          Nuevo
        </Button>
      </div>

      <OrderFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        pageSize={pageSize}
        setPageSize={setPageSize}
        setPage={setPage}
        onClearFilters={handleClearFilters}
      />

      <Card className='shadow-sm'>
        <CardHeader>
          <CardTitle className='text-lg sm:text-xl'>
            Lista de Pedidos ({paginatedOrders.length} de {filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent className='p-4 sm:p-6'>
          {isLoading ? (
            <div className='text-sm sm:text-base'>Cargando pedidos...</div>
          ) : error ? (
            <div className='text-red-500 text-sm sm:text-base'>{error}</div>
          ) : (
            <div className='overflow-x-auto'>
              <OrderTable orders={paginatedOrders} onRowClick={handleOpenDetail} />
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className='flex justify-center mt-4 sm:mt-6'>
          <Paginate page={page} totalPages={totalPages} setPage={setPage} />
        </div>
      )}

      <OrderDetailModal
        open={modalOpen}
        onClose={handleCloseModal}
        detail={orderDetail}
        isLoading={isDetailLoading}
        error={detailError}
        orderId={selectedOrderId}
        orderCode={selectedOrderCode}
        onVentaRegistrada={refetch}
        onOrderStatusChange={refetch}
      />
    </div>
  );
}
