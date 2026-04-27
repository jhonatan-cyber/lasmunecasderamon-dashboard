'use client';

import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import SelectElements from '@/components/shared/SelectElements';
import Paginate from '@/components/shared/Paginate';
import FilterSelect from '@/components/shared/selects/FilterSelect';
import { formatDateTimeLabel } from '@/lib/utils/calendarUtils';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import AsistenciaForm from '@/components/attendance/AsistenciaForm';

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
  const [asistenciaFormOpen, setAsistenciaFormOpen] = useState(false);

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
        <div className='flex gap-2'>
          <Button
            variant='outline'
            onClick={() => setAsistenciaFormOpen(true)}
            size='sm'
            className='rounded-full px-4 sm:px-6 py-2 bg-black text-white hover:bg-white hover:text-black hover:scale-105 transition-all duration-200 text-sm sm:text-base border-2 dark:bg-black dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black dark:hover:border-white'
          >
            <Plus className='w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2' />
            Registrar Manual
          </Button>
          <Button
            variant='outline'
            onClick={() => router.back()}
            size='sm'
            className='rounded-full px-4 sm:px-6 py-2 bg-black text-white hover:bg-white hover:text-black hover:scale-105 transition-all duration-200 text-sm sm:text-base border-2 dark:bg-black dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black dark:hover:border-white'
          >
            <ArrowLeft className='w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2' />
            Atrás
          </Button>
        </div>
      </div>

      {/* Total a cobrar centrado */}
      <div className='text-center'>
        <p className='text-sm text-gray-500'>TOTAL A COBRAR</p>
        <p className='text-2xl font-bold text-gray-900'>{formatCurrencyCLP(totalToCollect)}</p>
      </div>

      {/* Filtros */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4 w-full'>
        <div className='w-full'>
          <label className='block text-sm font-medium text-gray-700 mb-1'>Buscar</label>
          <input
            type='text'
            placeholder='Buscar por fecha u hora...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          label='Estado'
          placeholder='Todos'
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'pendiente', label: 'Por cobrar' },
            { value: 'pagado', label: 'Pagado' }
          ]}
        />
        <FilterSelect
          value={sortBy}
          onChange={setSortBy}
          label='Ordenar por'
          placeholder='Fecha'
          options={[
            { value: 'fecha', label: 'Fecha' },
            { value: 'sueldo', label: 'Sueldo' },
            { value: 'aporte', label: 'Aporte' },
            { value: 'total', label: 'Total' }
          ]}
        />
        <FilterSelect
          value={sortOrder}
          onChange={value => setSortOrder(value as 'asc' | 'desc')}
          label='Orden'
          placeholder='Descendente'
          options={[
            { value: 'desc', label: 'Descendente' },
            { value: 'asc', label: 'Ascendente' }
          ]}
        />
      </div>

      {/* Selector de filas por página */}
      <div className='flex justify-between items-center'>
        <FilterSelect
          value={rowsPerPage.toString()}
          onChange={value => {
            setRowsPerPage(parseInt(value));
            setCurrentPage(1);
          }}
          label='Elementos por página'
          placeholder='10'
          options={[
            { value: '5', label: '5 Datos' },
            { value: '10', label: '10 Datos' },
            { value: '20', label: '20 Datos' },
            { value: '50', label: '50 Datos' }
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

      {/* Modal de registro manual de asistencia */}
      <AsistenciaForm
        isOpen={asistenciaFormOpen}
        onOpenChange={setAsistenciaFormOpen}
        onSuccess={fetchAsistencias}
      />
    </div>
  );
}
