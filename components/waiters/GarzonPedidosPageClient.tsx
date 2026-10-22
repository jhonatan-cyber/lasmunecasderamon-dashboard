'use client';
import { ListLoadError } from '@/components/shared/ListLoadError';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@/components/ui/table';

import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useRouter } from 'next/navigation';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ModuleTableCard } from '@/components/shared/tables/ModuleTable';
import Paginate from '@/components/shared/Paginate';
import { useOrdersSSE } from '@/hooks/orders/useOrdersSSE';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import PedidosStatsCards from './PedidosStatsCards';
import { OrdersFilters } from './OrdersFilters';
import logger from '@/lib/utils/logger';

interface Order {
  id?: string | number;
  id_pedido: string;
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchOrders = async () => {
    setLoadError(false);
    if (orders.length === 0) {
      setLoading(true);
    }

    try {
      const response = await fetch('/api/orders/user');
      const data = await response.json();

      if (!response.ok || !data.success || !Array.isArray(data.data))
        throw new Error('No se pudieron cargar los pedidos');
      if (data.success) {
        setOrders(
          data.data.map((row: Order) => ({
            ...row,
            id_pedido: String(row.id ?? row.id_pedido),
            total: Number(row.total ?? 0),
            subtotal: Number(row.subtotal ?? 0),
            estado: Number(row.estado ?? 0)
          }))
        );
      } else {
        logger.error('Error fetching orders:', data.message);
      }
    } catch (error) {
      setLoadError(true);
      logger.captureException(error, { context: 'GarzonPedidosPageClient:fetchOrders' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !userLoading && user.role?.toLowerCase() === 'garzon') {
      fetchOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userLoading]);

  useOrdersSSE(data => {
    if (data.type === 'order-processed') {
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id_pedido === String(data.orderId) ? { ...order, estado: 0 } : order
        )
      );
    } else if (data.type === 'order-deleted') {
      setOrders(prevOrders => prevOrders.filter(order => order.id_pedido !== String(data.orderId)));
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

      if (aValue === bValue) return 0;
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

  if (loadError)
    return <ListLoadError message='No se pudieron cargar tus pedidos.' onRetry={fetchOrders} />;

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
      <ModuleTableCard>
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
              <Table className='min-w-full divide-y divide-gray-200'>
                <TableHeader>
                  <TableRow>
                    <TableHead className='text-left font-medium tracking-wider'>#</TableHead>
                    <TableHead className='text-left font-medium tracking-wider'>CÓDIGO</TableHead>
                    <TableHead className='text-left font-medium tracking-wider'>CLIENTE</TableHead>
                    <TableHead className='text-left font-medium tracking-wider'>GARZÓN</TableHead>
                    <TableHead className='text-left font-medium tracking-wider'>NICKS</TableHead>
                    <TableHead className='text-left font-medium tracking-wider'>SUBTOTAL</TableHead>
                    <TableHead className='text-left font-medium tracking-wider'>TOTAL</TableHead>
                    <TableHead className='text-left font-medium tracking-wider'>ESTADO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className='divide-y divide-gray-200 dark:divide-gray-800'>
                  {currentOrders.map((order, index) => (
                    <TableRow key={order.id_pedido}>
                      <TableCell className='whitespace-nowrap'>{startIndex + index + 1}</TableCell>
                      <TableCell className='whitespace-nowrap'>
                        <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                          {order.codigo || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className='whitespace-nowrap'>
                        <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                          {order.cliente_nombre || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className='whitespace-nowrap'>
                        <div className='text-sm text-gray-900 dark:text-gray-100'>
                          {order.mesero_nombre || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className='whitespace-nowrap'>
                        <div className='text-sm text-gray-900 dark:text-gray-100'>
                          {order.nicks || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className='whitespace-nowrap'>
                        <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                          {formatCurrencyCLP(order.subtotal || 0)}
                        </div>
                      </TableCell>
                      <TableCell className='whitespace-nowrap'>
                        <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                          {formatCurrencyCLP(order.total || 0)}
                        </div>
                      </TableCell>
                      <TableCell className='whitespace-nowrap'>
                        {getStatusBadge(order.estado)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </ModuleTableCard>

      {}
      {filteredOrders.length > 0 && (
        <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
          <div className='flex justify-center'>
            <Paginate page={currentPage} totalPages={totalPages} setPage={setCurrentPage} />
          </div>
        </div>
      )}
    </div>
  );
}
