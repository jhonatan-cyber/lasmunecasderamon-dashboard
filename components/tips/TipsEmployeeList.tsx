'use client';
import { EmptyState } from '@/components/shared/EmptyState';
import { useRealtimeRefresh } from '@/hooks/realtime/useRealtimeRefresh';
import { ListLoadError } from '@/components/shared/ListLoadError';
import { SortSelect } from '@/components/shared/selects/SortSelect';

import { FilterBar } from '@/components/shared/FilterBar';
import { ModuleTableCard } from '@/components/shared/tables/ModuleTable';
import { SELECT_LABEL_CLASS } from '@/components/shared/selectStyles';
import { Input } from '@/components/ui/input';
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
import SelectElements from '@/components/shared/SelectElements';
import { FilterSelect } from '@/components/shared/selects';
import Paginate from '@/components/shared/Paginate';
import { formatDateTimeDmyLabel } from '@/lib/utils/calendarUtils';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import logger from '@/lib/utils/logger';
import { Label } from '@/components/ui/label';

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

const TIP_STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'por_cobrar', label: 'Por cobrar' },
  { value: 'cobrado', label: 'Cobrado' }
];

const TIP_SORT_BY_OPTIONS = [
  { value: 'fecha_crea', label: 'Fecha creación' },
  { value: 'propina_fecha_crea', label: 'Fecha pago' },
  { value: 'monto', label: 'Monto' },
  { value: 'codigo_venta', label: 'Código' }
];

interface Props {
  allowedRole: string;
}

export function TipsEmployeeList({ allowedRole }: Props) {
  const { user, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('fecha_crea');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchTips = async () => {
    setLoadError(false);
    setLoading(true);
    try {
      const res = await fetch('/api/tips/user');
      const data = await res.json();
      if (!res.ok || !data.success || !Array.isArray(data.data))
        throw new Error('No se pudieron cargar los propinas');
      if (data.success) {
        setTips(
          data.data.map((row: Tip) => ({
            ...row,
            monto: Number(row.monto ?? 0),
            estado: Number(row.estado ?? 0)
          }))
        );
      } else {
        logger.error('Error fetching tips:', data.message);
      }
    } catch (error) {
      setLoadError(true);
      logger.captureException(error, { context: 'TipsEmployeeList:fetchTips' });
    } finally {
      setLoading(false);
    }
  };

  useRealtimeRefresh('/api/tips', fetchTips);

  useEffect(() => {
    if (user && !userLoading && user.role?.toLowerCase() === allowedRole) {
      fetchTips();
    }
  }, [user, userLoading, allowedRole]);

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

  const sortedTips = [...filteredTips].sort((a, b) => {
    let aValue: any = a[sortBy as keyof Tip];
    let bValue: any = b[sortBy as keyof Tip];

    if (sortBy === 'fecha_crea' || sortBy === 'propina_fecha_crea') {
      aValue = new Date(aValue || 0);
      bValue = new Date(bValue || 0);
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
  const paginatedTips = sortedTips.slice(startIndex, endIndex);
  const totalPages = Math.ceil(sortedTips.length / rowsPerPage);

  const totalToCollect = tips
    .filter(tip => tip.estado === 1)
    .reduce((sum, tip) => sum + (tip.monto || 0), 0);

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

  if (loadError)
    return <ListLoadError message='No se pudieron cargar tus propinas.' onRetry={fetchTips} />;

  return (
    <div className='p-6 space-y-6'>
      {}
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

      {}
      <div className='text-center'>
        <p className='text-sm text-gray-500'>TOTAL A COBRAR</p>
        <p className='text-2xl font-bold text-gray-900'>{formatCurrencyCLP(totalToCollect)}</p>
      </div>

      {}
      <FilterBar>
        <div>
          <Label htmlFor='buscar-propinas' className={SELECT_LABEL_CLASS}>
            Buscar
          </Label>
          <Input
            id='buscar-propinas'
            type='text'
            placeholder='Buscar por código o monto...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <FilterSelect
          label='Estado'
          value={statusFilter}
          onChange={setStatusFilter}
          options={TIP_STATUS_OPTIONS}
        />
        <SortSelect
          field={sortBy}
          direction={sortOrder}
          options={TIP_SORT_BY_OPTIONS}
          onChange={(field, direction) => {
            setSortBy(field as typeof sortBy);
            setSortOrder(direction);
          }}
        />
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
      </FilterBar>

      {}
      <ModuleTableCard>
        <CardHeader>
          <CardTitle aria-live='polite'>Propinas ({filteredTips.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className='text-center py-8'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto'></div>
              <p aria-live='polite' className='mt-2 text-gray-600'>
                Cargando propinas...
              </p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <Table className='w-full'>
                <TableHeader>
                  <TableRow className='border-b'>
                    <TableHead className='text-left font-medium'>#</TableHead>
                    <TableHead className='text-left font-medium'>CODIGO VENTA</TableHead>
                    <TableHead className='text-left font-medium'>PROPINA</TableHead>
                    <TableHead className='text-left font-medium'>FECHA VENTA</TableHead>
                    <TableHead className='text-left font-medium'>FECHA PAGO</TableHead>
                    <TableHead className='text-left font-medium'>ESTADO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTips.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className='py-12 text-center text-gray-500'>
                        <EmptyState variant='text' title='No se encontraron propinas' />
                      </TableCell>
                    </TableRow>
                  )}
                  {paginatedTips.map((tip, index) => {
                    const creacionDate = formatDateTimeDmyLabel(tip.fecha_crea);
                    return (
                      <TableRow key={`${tip.codigo_venta}-${index}`} className='border-b'>
                        <TableCell>{startIndex + index + 1}</TableCell>
                        <TableCell>{tip.codigo_venta || 'Sin código'}</TableCell>
                        <TableCell>{formatCurrencyCLP(tip.monto)}</TableCell>
                        <TableCell>
                          <div>
                            <div className='font-medium text-gray-900'>{creacionDate.date}</div>
                            <div className='text-sm text-gray-500'>{creacionDate.time}</div>
                          </div>
                        </TableCell>
                        <TableCell>{renderFechaPago(tip)}</TableCell>
                        <TableCell>{getStatusBadge(tip.estado)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
    </div>
  );
}
