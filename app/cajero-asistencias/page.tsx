'use client';

import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import SelectElements from '@/components/ui/select-elements';
import Paginate from '@/components/ui/paginate';
import { formatDateTimeLabel } from '@/lib/utils/calendarUtils';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

interface Asistencia {
  id_asistencia: number;
  usuario_id: number;
  fecha: string;
  hora: string;
  sueldo: number;
  aporte: number;
  estado: number;
  total?: number;
  fecha_pago?: string | null;
}

export default function CajeroAsistenciasPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('fecha');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch asistencias
  const fetchAsistencias = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/attendance/user?tipo=detalle');
      const data = await res.json();

      if (data.success) {
        setAsistencias(data.data || []);
      } else {
        console.error('Error fetching asistencias:', data.message);
      }
    } catch (error) {
      console.error('Error fetching asistencias:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !userLoading) {
      fetchAsistencias();
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

  // Verificar que el usuario sea cajero
  if (user?.role?.toLowerCase() !== 'cajero') {
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
  const filteredAsistencias = asistencias.filter(asistencia => {
    const matchesSearch =
      asistencia.fecha?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false ||
      asistencia.hora?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pendiente' && asistencia.estado === 1) ||
      (statusFilter === 'pagado' && asistencia.estado === 0);

    return matchesSearch && matchesStatus;
  });

  // Ordenamiento
  const sortedAsistencias = [...filteredAsistencias].sort((a, b) => {
    let aValue: any = a[sortBy as keyof Asistencia];
    let bValue: any = b[sortBy as keyof Asistencia];

    if (sortBy === 'fecha') {
      aValue = new Date(a.fecha);
      bValue = new Date(b.fecha);
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
  const paginatedAsistencias = sortedAsistencias.slice(startIndex, endIndex);
  const totalPages = Math.ceil(sortedAsistencias.length / rowsPerPage);

  // Cálculos
  const totalSalary = asistencias.reduce((sum, asistencia) => sum + (asistencia.sueldo || 0), 0);
  const totalContribution = asistencias.reduce(
    (sum, asistencia) => sum + (asistencia.aporte || 0),
    0
  );
  const totalToCollect = totalSalary - totalContribution;

  const formatHoraHHMM = (hora?: string) => (hora ? hora.slice(0, 5) : '—');

  const getPaymentDateBadge = (fechaPago: string | null | undefined, estado: number) => {
    if (!fechaPago || estado === 1) {
      return (
        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800'>
          Por cobrar
        </span>
      );
    }
    const { date } = formatDateTimeLabel(fechaPago);
    return <div className='text-sm text-gray-900'>{date}</div>;
  };

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
          Pagado
        </span>
      );
    }
  };

  return (
    <div className='p-6 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Listado de Asistencias</h1>
          <p className='text-gray-600'>
            Asistencias de {user?.name} {user?.lastName}
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
            placeholder='Buscar por fecha u hora...'
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
            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
          >
            <option value='all'>Todos</option>
            <option value='pendiente'>Por cobrar</option>
            <option value='pagado'>Pagado</option>
          </select>
        </div>
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>Ordenar por</label>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
          >
            <option value='fecha'>Fecha</option>
            <option value='sueldo'>Sueldo</option>
            <option value='aporte'>Aporte</option>
            <option value='total'>Total</option>
          </select>
        </div>
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>Orden</label>
          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as 'asc' | 'desc')}
            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
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
          <CardTitle>Asistencias ({filteredAsistencias.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className='text-center py-8'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto'></div>
              <p className='mt-2 text-gray-600'>Cargando asistencias...</p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b border-gray-200'>
                    <th className='text-left py-3 px-4 font-medium text-gray-900'>#</th>
                    <th className='text-left py-3 px-4 font-medium text-gray-900'>FECHA</th>
                    <th className='text-left py-3 px-4 font-medium text-gray-900'>SUELDO</th>
                    <th className='text-left py-3 px-4 font-medium text-gray-900'>APORTE</th>
                    <th className='text-left py-3 px-4 font-medium text-gray-900'>TOTAL</th>
                    <th className='text-left py-3 px-4 font-medium text-gray-900'>FECHA DE PAGO</th>
                    <th className='text-left py-3 px-4 font-medium text-gray-900'>ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAsistencias.map((asistencia, index) => {
                    const { date } = formatDateTimeLabel(asistencia.fecha);
                    const hora = formatHoraHHMM(asistencia.hora);
                    return (
                      <tr
                        key={`${asistencia.id_asistencia}-${startIndex + index}`}
                        className='border-b border-gray-100 hover:bg-gray-50'
                      >
                        <td className='py-3 px-4'>
                          <div className='w-8 h-8 rounded-full bg-purple-300 flex items-center justify-center text-purple-800 font-medium text-sm'>
                            {startIndex + index + 1}
                          </div>
                        </td>
                        <td className='py-3 px-4'>
                          <div>
                            <div className='font-medium text-gray-900'>{date}</div>
                            <div className='text-sm text-gray-500'>{hora}</div>
                          </div>
                        </td>
                        <td className='py-3 px-4 text-gray-900'>
                          {formatCurrencyCLP(asistencia.sueldo)}
                        </td>
                        <td className='py-3 px-4 text-gray-900'>
                          {formatCurrencyCLP(asistencia.aporte)}
                        </td>
                        <td className='py-3 px-4 text-gray-900'>
                          {formatCurrencyCLP((asistencia.sueldo || 0) - (asistencia.aporte || 0))}
                        </td>
                        <td className='py-3 px-4'>
                          {getPaymentDateBadge(asistencia.fecha_pago ?? null, asistencia.estado)}
                        </td>
                        <td className='py-3 px-4'>{getStatusBadge(asistencia.estado)}</td>
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
