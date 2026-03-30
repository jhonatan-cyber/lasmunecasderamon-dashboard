'use client';

import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import SelectElements from '@/components/shared/SelectElements';
import Paginate from '@/components/shared/Paginate';
import { formatDateTimeDmyLabel } from '@/lib/utils/calendarUtils';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

interface Tip {
  id_detalle_propina: number;
  propina_id: number;
  usuario_id: number;
  monto: number;
  fecha_crea: string;
  estado: number;
  propina_fecha_crea: string;
  codigo_venta: string;
}

export default function GarzonPropinasPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('fecha_crea');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch propinas
  const fetchTips = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tips/user');
      const data = await res.json();
      if (data.success) {
        setTips(data.data || []);
      } else {
        console.error('Error fetching tips:', data.message);
      }
    } catch (error) {
      console.error('Error fetching tips:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !userLoading) {
      fetchTips();
    }
  }, [user, userLoading]);

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

  // Verificar que el usuario sea garzon
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

  // Filtrado
  const filteredTips = tips.filter(tip => {
    const matchesSearch =
      tip.codigo_venta?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false ||
      tip.monto?.toString().includes(searchTerm) ||
      false;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'por_cobrar' && tip.estado === 1) ||
      (statusFilter === 'cobrado' && tip.estado === 0);

    return matchesSearch && matchesStatus;
  });

  // Ordenamiento
  const sortedTips = [...filteredTips].sort((a, b) => {
    let aValue: any = a[sortBy as keyof Tip];
    let bValue: any = b[sortBy as keyof Tip];

    if (sortBy === 'fecha_crea' || sortBy === 'propina_fecha_crea') {
      aValue = new Date(aValue || 0);
      bValue = new Date(bValue || 0);
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Paginación
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedTips = sortedTips.slice(startIndex, endIndex);
  const totalPages = Math.ceil(sortedTips.length / rowsPerPage);

  // Cálculos
  const totalToCollect = tips
    .filter(tip => tip.estado === 1)
    .reduce((sum, tip) => sum + (tip.monto || 0), 0);

  // Obtener badge de estado
  const getStatusBadge = (estado: number) => {
    if (estado === 1) {
      return (
        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800'>
          Por cobrar
        </span>
      );
    } else {
      return (
        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700'>
          Cobrado
        </span>
      );
    }
  };

  const renderFechaPago = (tip: Tip) => {
    if (tip.estado === 1) {
      return (
        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800'>
          Por cobrar
        </span>
      );
    }
    if (tip.propina_fecha_crea) {
      const pagoDate = formatDateTimeDmyLabel(tip.propina_fecha_crea);
      return (
        <div>
          <div className='font-medium text-gray-900'>{pagoDate.date}</div>
          <div className='text-sm text-gray-500'>{pagoDate.time}</div>
        </div>
      );
    }
    return '—';
  };

  return (
    <div className='p-6 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Listado de Propinas</h1>
          <p className='text-gray-600'>
            Propinas de {user?.name} {user?.lastName}
          </p>
        </div>
        <Button
          variant='outline'
          onClick={() => router.back()}
          className='rounded-full bg-black text-white hover:scale-105 transition-all duration-200'
        >
          <ArrowLeft className='w-4 h-4 mr-2' />
          Atrás
        </Button>
      </div>

      {/* Total a cobrar centrado */}
      <div className='text-center'>
        <p className='text-sm text-gray-500'>TOTAL A COBRAR</p>
        <p className='text-2xl font-bold text-gray-900'>{formatCurrencyCLP(totalToCollect)}</p>
      </div>

      {/* Filtros */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>Buscar</label>
          <input
            type='text'
            placeholder='Buscar por código o monto...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>Estado</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className='w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500'
          >
            <option value='all'>Todos</option>
            <option value='por_cobrar'>Por cobrar</option>
            <option value='cobrado'>Cobrado</option>
          </select>
        </div>
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>Ordenar por</label>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className='w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500'
          >
            <option value='fecha_crea'>Fecha creación</option>
            <option value='propina_fecha_crea'>Fecha pago</option>
            <option value='monto'>Monto</option>
            <option value='codigo_venta'>Código</option>
          </select>
        </div>
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>Orden</label>
          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as 'asc' | 'desc')}
            className='w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500'
          >
            <option value='desc'>Descendente</option>
            <option value='asc'>Ascendente</option>
          </select>
        </div>
      </div>

      {/* Selector de filas por página */}
      <div className='flex justify-between items-center'>
        <SelectElements
          value={rowsPerPage}
          onChange={value => {
            setRowsPerPage(value);
            setCurrentPage(1);
          }}
          options={[
            { value: 5, label: '5 por página' },
            { value: 10, label: '10 por página' },
            { value: 20, label: '20 por página' },
            { value: 50, label: '50 por página' }
          ]}
        />
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Propinas ({filteredTips.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className='text-center py-8'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto'></div>
              <p className='mt-2 text-gray-600'>Cargando propinas...</p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b border-gray-200'>
                    <th className='text-left py-3 px-4 font-medium text-gray-900'>#</th>
                    <th className='text-left py-3 px-4 font-medium text-gray-900'>CODIGO VENTA</th>
                    <th className='text-left py-3 px-4 font-medium text-gray-900'>PROPINA</th>
                    <th className='text-left py-3 px-4 font-medium text-gray-900'>FECHA VENTA</th>
                    <th className='text-left py-3 px-4 font-medium text-gray-900'>FECHA PAGO</th>
                    <th className='text-left py-3 px-4 font-medium text-gray-900'>ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTips.map((tip, index) => {
                    const creacionDate = formatDateTimeDmyLabel(tip.fecha_crea);
                    return (
                      <tr
                        key={`${tip.codigo_venta}-${index}`}
                        className='border-b border-gray-100 hover:bg-gray-50'
                      >
                        <td className='py-3 px-4'>
                          <div className='w-8 h-8 rounded-full bg-purple-300 flex items-center justify-center text-purple-800 font-medium text-sm'>
                            {startIndex + index + 1}
                          </div>
                        </td>
                        <td className='py-3 px-4 text-gray-900'>
                          {tip.codigo_venta || 'Sin código'}
                        </td>
                        <td className='py-3 px-4 text-gray-900'>{formatCurrencyCLP(tip.monto)}</td>
                        <td className='py-3 px-4'>
                          <div>
                            <div className='font-medium text-gray-900'>{creacionDate.date}</div>
                            <div className='text-sm text-gray-500'>{creacionDate.time}</div>
                          </div>
                        </td>
                        <td className='py-3 px-4'>{renderFechaPago(tip)}</td>
                        <td className='py-3 px-4'>{getStatusBadge(tip.estado)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className='flex justify-center'>
          <Paginate page={currentPage} totalPages={totalPages} setPage={setCurrentPage} />
        </div>
      )}
    </div>
  );
}
