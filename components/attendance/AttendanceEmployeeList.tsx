'use client';
import { useRealtimeRefresh } from '@/hooks/realtime/useRealtimeRefresh';
import { EmployeeGratifications } from './EmployeeGratifications';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ListLoadError } from '@/components/shared/ListLoadError';
import { SortSelect } from '@/components/shared/selects/SortSelect';
import { FilterBar } from '@/components/shared/FilterBar';

import { Input } from '@/components/ui/input';
import { SELECT_INPUT_CLASS, SELECT_LABEL_CLASS } from '@/components/shared/selectStyles';

import { useState, useEffect } from 'react';
import {
  ModuleTable,
  ModuleTableHeader,
  ModuleTableRow,
  ModuleTableHead,
  ModuleTableBody,
  ModuleTableCell,
  ModuleTableCard
} from '@/components/shared/tables/ModuleTable';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useRouter } from 'next/navigation';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, DollarSign, Users, Plus } from 'lucide-react';
import { FilterSelect } from '@/components/shared/selects';
import Paginate from '@/components/shared/Paginate';
import { formatDateTimeDmyLabel } from '@/lib/utils/calendarUtils';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import AsistenciaForm from '@/components/attendance/AsistenciaForm';
import logger from '@/lib/utils/logger';

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

interface Props {
  allowedRole: string;
  showHousingSummary?: boolean;
}

export function AttendanceEmployeeList({ allowedRole, showHousingSummary = false }: Props) {
  const { user, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeTab, setActiveTab] = useState('asistencias');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('fecha');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [asistenciaFormOpen, setAsistenciaFormOpen] = useState(false);
  const [housingDiscountTotal, setHousingDiscountTotal] = useState<number>(0);
  const [weeksWithDiscount, setWeeksWithDiscount] = useState<number>(0);
  const [discountPerWeek, setDiscountPerWeek] = useState<number>(0);

  const fetchAsistencias = async () => {
    setLoadError(false);
    setLoading(true);
    try {
      const res = await fetch('/api/attendance/user?tipo=detalle');
      const data = await res.json();

      if (!res.ok || !data.success || !Array.isArray(data.data))
        throw new Error('No se pudieron cargar los asistencias');
      if (data.success) {
        setAsistencias(
          data.data.map((row: Asistencia) => ({
            ...row,
            sueldo: Number(row.sueldo ?? 0),
            aporte: Number(row.aporte ?? 0),
            estado: Number(row.estado ?? 0)
          }))
        );
      } else {
        logger.error('Error fetching asistencias:', data.message);
      }

      if (showHousingSummary) {
        try {
          const resSummary = await fetch('/api/attendance/user');
          const summary = await resSummary.json();
          if (
            resSummary.ok &&
            summary.success &&
            Array.isArray(summary.data) &&
            summary.data.length > 0
          ) {
            const row = summary.data[0];
            setHousingDiscountTotal(Number(row.descuento_total || 0));
            setDiscountPerWeek(Number(row.descuento || 0));

            const weeks =
              row.semanas_con_descuento !== undefined && row.semanas_con_descuento !== null
                ? Number(row.semanas_con_descuento)
                : Number(row.descuento || 0) > 0
                  ? Math.round(Number(row.descuento_total || 0) / Number(row.descuento || 0))
                  : 0;
            setWeeksWithDiscount(weeks);
          } else {
            setHousingDiscountTotal(0);
            setDiscountPerWeek(0);
            setWeeksWithDiscount(0);
          }
        } catch (error) {
          logger.captureException(error, {
            context: 'AttendanceEmployeeList:fetchHousingSummary'
          });
          setHousingDiscountTotal(0);
          setDiscountPerWeek(0);
          setWeeksWithDiscount(0);
        }
      }
    } catch (error) {
      setLoadError(true);
      logger.captureException(error, { context: 'AttendanceEmployeeList:fetchAsistencias' });
    } finally {
      setLoading(false);
    }
  };

  useRealtimeRefresh(
    '/api/attendance/user',
    fetchAsistencias,
    !!user && !userLoading && user.role?.toLowerCase() === allowedRole
  );

  useEffect(() => {
    if (user && !userLoading && user.role?.toLowerCase() === allowedRole) {
      fetchAsistencias();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userLoading, showHousingSummary, allowedRole]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortBy, sortOrder, rowsPerPage]);

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

  if (user?.role?.toLowerCase() !== allowedRole) {
    return (
      <div className='p-6 flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-red-600 mb-4'>Acceso Denegado</h1>
          <p className='text-gray-600'>No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    );
  }

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

  const sortedAsistencias = [...filteredAsistencias].sort((a, b) => {
    let aValue: any = a[sortBy as keyof Asistencia];
    let bValue: any = b[sortBy as keyof Asistencia];

    if (sortBy === 'fecha') {
      aValue = new Date(a.fecha);
      bValue = new Date(b.fecha);
    }

    if (aValue === bValue) return 0;
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedAsistencias = sortedAsistencias.slice(startIndex, endIndex);
  const totalPages = Math.ceil(sortedAsistencias.length / rowsPerPage);

  const asistenciasPendientes = asistencias.filter(asistencia => asistencia.estado === 1);
  const totalSalary = asistenciasPendientes.reduce(
    (sum, asistencia) => sum + (asistencia.sueldo || 0),
    0
  );
  const totalContribution = asistenciasPendientes.reduce(
    (sum, asistencia) => sum + (asistencia.aporte || 0),
    0
  );
  const totalToCollectBase = totalSalary - totalContribution;
  const totalToCollect = showHousingSummary
    ? Math.max(0, totalToCollectBase - (housingDiscountTotal || 0))
    : totalToCollectBase;

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

  const getPaymentDateBadge = (fechaPago: string | null | undefined, estado: number) => {
    if (!fechaPago || estado === 1) {
      return (
        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800'>
          Por cobrar
        </span>
      );
    } else {
      const { date } = formatDateTimeDmyLabel(fechaPago);
      return <div className='text-sm text-gray-900 dark:text-gray-100'>{date}</div>;
    }
  };

  return (
    <div className='p-6 space-y-6'>
      {}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
            Listado de Asistencias
          </h1>
          <p className='text-gray-600'>
            Asistencias de {user?.name} {user?.lastName}
          </p>
        </div>
        <div className='flex gap-2'>
          {['garzon', 'cajero'].includes(allowedRole) && (
            <Button
              variant='outline'
              onClick={() => setAsistenciaFormOpen(true)}
              size='sm'
              className='rounded-full px-4 sm:px-6 py-2 bg-black text-white hover:bg-white hover:text-black hover:scale-105 transition-all duration-200 text-sm sm:text-base border-2 dark:bg-black dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black dark:hover:border-white'
            >
              <Plus className='w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2' />
              Registrar Manual
            </Button>
          )}
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

      {}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList aria-label='Mi jornada' className='h-11 rounded-full'>
          <TabsTrigger value='asistencias' className='rounded-full'>
            Asistencias
          </TabsTrigger>
          <TabsTrigger value='gratificaciones' className='rounded-full'>
            Gratificaciones
          </TabsTrigger>
        </TabsList>
        <TabsContent value='asistencias' className='space-y-6'>
          {loadError ? (
            <ListLoadError
              message='No se pudieron cargar tus asistencias.'
              onRetry={fetchAsistencias}
            />
          ) : (
            <>
              <div className='text-center space-y-2'>
                {showHousingSummary && (
                  <div className='flex justify-center gap-8 flex-wrap'>
                    <div>
                      <p className='text-sm text-gray-500'>Total Sueldo:</p>
                      <p className='text-xl font-bold text-gray-900 dark:text-white'>
                        {formatCurrencyCLP(totalSalary)}
                      </p>
                    </div>
                    <div>
                      <p className='text-sm text-gray-500'>Total Aporte:</p>
                      <p className='text-xl font-bold text-gray-900 dark:text-white'>
                        {formatCurrencyCLP(totalContribution)}
                      </p>
                    </div>
                    <div>
                      <p className='text-sm text-gray-500'>Descuento Habitación (semanal):</p>
                      <p className='text-sm text-gray-600 dark:text-gray-400'>
                        Semanas: {weeksWithDiscount} | Monto/semana:{' '}
                        {formatCurrencyCLP(discountPerWeek)}
                      </p>
                      <p className='text-xl font-bold text-gray-900 dark:text-white'>
                        {formatCurrencyCLP(housingDiscountTotal)}
                      </p>
                    </div>
                  </div>
                )}
                <div>
                  <p className='text-sm text-gray-500'>TOTAL A COBRAR</p>
                  <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                    {formatCurrencyCLP(totalToCollect)}
                  </p>
                </div>
              </div>

              {}
              <FilterBar>
                <div className='w-full'>
                  <label htmlFor='buscar-asistencias' className={SELECT_LABEL_CLASS}>
                    Buscar
                  </label>
                  <Input
                    id='buscar-asistencias'
                    type='text'
                    placeholder='Buscar por fecha u hora...'
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className={SELECT_INPUT_CLASS}
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
                    { value: 'pagado', label: 'Cobrado' }
                  ]}
                />
                <SortSelect
                  field={sortBy}
                  direction={sortOrder}
                  options={[
                    { value: 'fecha', label: 'Fecha' },
                    { value: 'sueldo', label: 'Sueldo' },
                    { value: 'aporte', label: 'Aporte' },
                    { value: 'total', label: 'Total' }
                  ]}
                  onChange={(field, direction) => {
                    setSortBy(field);
                    setSortOrder(direction);
                    setCurrentPage(1);
                  }}
                />

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
              </FilterBar>

              {}
              <ModuleTableCard>
                <CardHeader>
                  <CardTitle aria-live='polite'>
                    Asistencias ({filteredAsistencias.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className='p-0'>
                  {loading ? (
                    <div className='text-center py-8'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto'></div>
                      <p aria-live='polite' className='mt-2 text-gray-600'>
                        Cargando asistencias...
                      </p>
                    </div>
                  ) : (
                    <div className='overflow-x-auto'>
                      <ModuleTable>
                        <ModuleTableHeader>
                          <ModuleTableRow>
                            <ModuleTableHead>#</ModuleTableHead>
                            <ModuleTableHead>FECHA</ModuleTableHead>
                            <ModuleTableHead>SUELDO</ModuleTableHead>
                            <ModuleTableHead>APORTE</ModuleTableHead>
                            <ModuleTableHead>TOTAL</ModuleTableHead>
                            <ModuleTableHead>FECHA DE PAGO</ModuleTableHead>
                            <ModuleTableHead>ESTADO</ModuleTableHead>
                          </ModuleTableRow>
                        </ModuleTableHeader>
                        <ModuleTableBody>
                          {paginatedAsistencias.map((asistencia, index) => {
                            const { date } = formatDateTimeDmyLabel(asistencia.fecha);
                            const hora = asistencia.hora ? asistencia.hora.slice(0, 5) : '';
                            return (
                              <ModuleTableRow
                                key={`${asistencia.id_asistencia}-${startIndex + index}`}
                              >
                                <ModuleTableCell>
                                  <div className='w-8 h-8 rounded-full bg-purple-300 flex items-center justify-center text-purple-800 font-medium text-sm'>
                                    {startIndex + index + 1}
                                  </div>
                                </ModuleTableCell>
                                <ModuleTableCell>
                                  <div>
                                    <div className='font-medium text-gray-900 dark:text-gray-100'>
                                      {date}
                                    </div>
                                    <div className='text-sm text-gray-500'>{hora || '—'}</div>
                                  </div>
                                </ModuleTableCell>
                                <ModuleTableCell>
                                  {formatCurrencyCLP(asistencia.sueldo)}
                                </ModuleTableCell>
                                <ModuleTableCell>
                                  {formatCurrencyCLP(asistencia.aporte)}
                                </ModuleTableCell>
                                <ModuleTableCell>
                                  {formatCurrencyCLP(asistencia.total)}
                                </ModuleTableCell>
                                <ModuleTableCell>
                                  {getPaymentDateBadge(
                                    asistencia.fecha_pago ?? null,
                                    asistencia.estado
                                  )}
                                </ModuleTableCell>
                                <ModuleTableCell>
                                  {getStatusBadge(asistencia.estado)}
                                </ModuleTableCell>
                              </ModuleTableRow>
                            );
                          })}
                        </ModuleTableBody>
                      </ModuleTable>
                    </div>
                  )}
                </CardContent>
              </ModuleTableCard>

              {}
              {totalPages > 1 && (
                <div className='flex justify-center'>
                  <Paginate page={currentPage} totalPages={totalPages} setPage={setCurrentPage} />
                </div>
              )}

              {}
              {['garzon', 'cajero'].includes(allowedRole) && asistenciaFormOpen && (
                <AsistenciaForm
                  isOpen={asistenciaFormOpen}
                  onOpenChange={setAsistenciaFormOpen}
                  onSuccess={fetchAsistencias}
                />
              )}
            </>
          )}
        </TabsContent>
        <TabsContent value='gratificaciones'>
          <EmployeeGratifications />
        </TabsContent>
      </Tabs>
    </div>
  );
}
