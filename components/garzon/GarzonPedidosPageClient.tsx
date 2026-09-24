'use client';

import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import SelectElements from '@/components/shared/SelectElements';
import Paginate from '@/components/shared/Paginate';
import { useOrdersSSE } from '@/hooks/orders/useOrdersSSE';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import PedidosStatsCards from './PedidosStatsCards';
import { OrdersFilters } from './OrdersFilters';
import logger from '@/lib/utils/logger';

interface Order {
  id_pedido: number;
  cliente_nombre: string;
  codigo: string;
  mesero_nombre: string;
  mesero_nick?: string;
  nicks: string | null;
  subtotal: number;
  total: number;
  estado: number;
}

export default function GarzonPedidosPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchOrders = async () => {
    if (orders.length === 0) {
      setLoading(true);
    }

    try {
      const response = await fetch('/api/orders/user');
      const data = await response.json();

      if (data.success) {
        setOrders(data.data || []);
      } else {
        logger.error('Error fetching orders:', data.message);
      }
    } catch (error) {
      logger.captureException(error, { context: 'GarzonPedidosPageClient:fetchOrders' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !userLoading) {
      fetchOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userLoading]);

  useOrdersSSE(data => {
    if (data.type === 'order-processed') {
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id_pedido === data.orderId ? { ...order, estado: 0 } : order
        )
      );
    } else if (data.type === 'order-deleted') {
      setOrders(prevOrders => prevOrders.filter(order => order.id_pedido !== data.orderId));
    } else if (data.type === 'order-created') {
      fetchOrders();
    }
  });

  useEffect(() => {
    let filtered = [...orders];

    if (searchTerm) {
      filtered = filtered.filter(
        order =>
          order.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.nicks?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.estado === parseInt(statusFilter));
    }

    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Order];
      let bValue: any = b[sortBy as keyof Order];

      if (sortBy === 'total' || sortBy === 'subtotal') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredOrders(filtered);
    setCurrentPage(1);
  }, [orders, searchTerm, statusFilter, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  const totalOrders = orders.length;
  const totalAmount = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const pendingOrders = orders.filter(order => order.estado === 1).length;
  const approvedOrders = orders.filter(order => order.estado === 0).length;
  const rejectedOrders = orders.filter(order => order.estado === 2).length;

  const getStatusBadge = (estado: number) => {
    switch (estado) {
      case 1:
        return (
          <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800'>
            Pendiente
          </span>
        );
      case 0:
        return (
          <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'>
            Aprobado
          </span>
        );
      case 2:
        return (
          <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800'>
            Rechazado
          </span>
        );
      case 3:
        return (
          <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'>
            Cancelado
          </span>
        );
      default:
        return (
          <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'>
            Desconocido
          </span>
        );
    }
  };

  if (userLoading) {
    return (
      <div className='p-6 flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto'></div>
          <p className='mt-4 text-gray-600'>Cargando...</p>
        </div>
      </div>
    );
  }

  if (user?.role?.toLowerCase() !== 'garzon') {
    return (
      <div className='p-6 flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-red-600 mb-4'>Acceso Denegado</h1>
          <p className='text-gray-600'>No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
      {}
      <div className='flex items-center justify-between gap-2 flex-wrap'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-white'>
            Listado de Pedidos
          </h1>
          <p className='text-gray-600'>
            Pedidos realizados por {user?.name} {user?.lastName}
          </p>
        </div>
        <Button
          onClick={() => router.back()}
          variant='outline'
          className='rounded-full bg-black text-white hover:scale-105 transition-all duration-200'
        >
          <ArrowLeft className='h-4 w-4 mr-2' />
          Atrás
        </Button>
      </div>

      {}
      <PedidosStatsCards
        totalOrders={totalOrders}
        totalAmount={totalAmount}
        pendingOrders={pendingOrders}
        approvedOrders={approvedOrders}
        rejectedOrders={rejectedOrders}
      />

      {}
      <OrdersFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        onClearFilters={() => {
          setSearchTerm('');
          setStatusFilter('all');
          setSortBy('total');
          setSortOrder('desc');
        }}
        rowsPerPage={rowsPerPage}
        setRowsPerPage={setRowsPerPage}
        setPage={setCurrentPage}
      />

      {}
      <Card>
        <CardHeader>
          <CardTitle>Pedidos ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className='flex items-center justify-center py-8'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
              <span className='ml-2'>Cargando pedidos...</span>
            </div>
          ) : currentOrders.length === 0 ? (
            <div className='text-center py-8 text-gray-500'>No se encontraron pedidos</div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      #
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      CÓDIGO
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      CLIENTE
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      GARZÓN
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      NICKS
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      SUBTOTAL
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      TOTAL
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      ESTADO
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                  {currentOrders.map((order, index) => (
                    <tr key={order.id_pedido} className='hover:bg-gray-50'>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='flex items-center justify-center w-8 h-8 rounded-full bg-purple-300 text-purple-800 font-semibold text-sm'>
                          {startIndex + index + 1}
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                          {order.codigo || 'N/A'}
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                          {order.cliente_nombre || 'N/A'}
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='text-sm text-gray-900 dark:text-gray-100'>
                          {order.mesero_nombre || 'N/A'}
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='text-sm text-gray-900 dark:text-gray-100'>
                          {order.nicks || 'N/A'}
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                          {formatCurrencyCLP(order.subtotal || 0)}
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                          {formatCurrencyCLP(order.total || 0)}
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        {getStatusBadge(order.estado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {}
      {filteredOrders.length > 0 && (
        <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
          <div className='flex items-center gap-2'>
            <span className='text-sm text-gray-700 dark:text-gray-200'>Mostrar</span>
            <SelectElements
              value={rowsPerPage}
              onChange={value => {
                setRowsPerPage(value);
                setCurrentPage(1);
              }}
              options={[5, 10, 20, 50]}
            />
            <span className='text-sm text-gray-700 dark:text-gray-200'>por página</span>
          </div>

          <div className='flex justify-center'>
            <Paginate page={currentPage} totalPages={totalPages} setPage={setCurrentPage} />
          </div>
        </div>
      )}
    </div>
  );
}
