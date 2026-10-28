'use client';
import { EmptyState } from '@/components/shared/EmptyState';
import { ListLoadError } from '@/components/shared/ListLoadError';
import { FilterBar } from '@/components/shared/FilterBar';
import { SortSelect } from '@/components/shared/selects/SortSelect';

import { useState, useEffect } from 'react';
import { SELECT_INPUT_CLASS, SELECT_LABEL_CLASS } from '@/components/shared/selectStyles';
import {
  ModuleTable,
  ModuleTableHeader,
  ModuleTableRow,
  ModuleTableHead,
  ModuleTableBody,
  ModuleTableCell,
  ModuleTableCard
} from '@/components/shared/tables/ModuleTable';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { ArrowLeft, Search } from 'lucide-react';
import { SortableTh } from '@/components/shared/SortableTh';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import SelectElements from '@/components/shared/SelectElements';
import Paginate from '@/components/shared/Paginate';
import { formatDateLabel, formatDateTimeDmyLabel } from '@/lib/utils/calendarUtils';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import logger from '@/lib/utils/logger';
import { Label } from '@/components/ui/label';

interface Commission {
  id_comision: number;
  codigo: string;
  comision: number;
  fecha_crea: string;
  fecha_mod: string;
  estado: number;
  tipo: 'venta' | 'servicio' | 'otro';
}

export default function AnfitrionaComisionesPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<keyof Commission>('fecha_crea');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const fetchCommissions = async () => {
    setLoadError(false);
    setLoading(true);
    try {
      const res = await fetch('/api/commissions/user?tipo=detalle');
      const data = await res.json();

      if (res.ok && data.success && Array.isArray(data.data)) {
        setCommissions(
          (data.data || [])
            .filter((row: any) => row.tipo === 'venta')
            .map((row: any) => ({
              ...row,
              id_comision: row.id,
              comision: Number(row.monto || 0),
              fecha_mod: row.fecha_pago,
              estado: Number(row.estado)
            }))
        );
      } else {
        throw new Error('No se pudieron cargar tus comisiones.');
      }
    } catch (error) {
      logger.captureException(error, { context: 'AnfitrionaComisiones:fetchCommissions' });
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userLoading && user?.role?.toLowerCase() === 'anfitriona') void fetchCommissions();
  }, [userLoading, user]);

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

  if (user?.role?.toLowerCase() !== 'anfitriona') {
    return (
      <div className='p-6 flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-red-600 mb-4'>Acceso Denegado</h1>
          <p className='text-gray-600'>No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  const totalCommissions = commissions.length;
  const totalAmount = commissions
    .filter(commission => commission.estado !== 0)
    .reduce((sum, commission) => sum + (commission.comision || 0), 0);
  const pendingCommissionsCount = commissions.filter(commission => commission.estado === 1).length;
  const totalPendingAmount = commissions
    .filter(commission => commission.estado === 1)
    .reduce((sum, commission) => sum + (commission.comision || 0), 0);

  const filteredCommissions = commissions.filter(commission => {
    if (!searchTerm) return true;

    try {
      const date = formatDateLabel(commission.fecha_crea);
      return (
        date.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (commission.comision || 0).toString().includes(searchTerm) ||
        (commission.codigo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (commission.tipo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (commission.id_comision || '').toString().includes(searchTerm)
      );
    } catch (error) {
      return false;
    }
  });

  const sortedCommissions = [...filteredCommissions].sort((a: any, b: any) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    return 0;
  });

  const paginatedCommissions = sortedCommissions.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );
  const totalPages = Math.ceil(sortedCommissions.length / rowsPerPage) || 1;

  const handleSort = (field: keyof Commission) => {
    setPage(1);
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

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
          {estado === 2 ? 'Cobrado' : 'Anulado'}
        </span>
      );
    }
  };

  if (loadError)
    return (
      <ListLoadError message='No se pudieron cargar tus comisiones.' onRetry={fetchCommissions} />
    );

  return (
    <div className='p-6 space-y-6'>
      <BoneyardSkeleton name='anfitriona-comisiones-main' loading={loading}>
        {}
        <div className='flex justify-between items-center'>
          <div>
            <p className='text-sm text-gray-500'>LAS MUÑECAS DE RAMÓN</p>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
              Listado de Comisiones {user?.name} {user?.lastName}
            </h1>
          </div>
          <Button
            variant='outline'
            onClick={() => router.back()}
            className='flex items-center gap-2 rounded-full bg-black text-white hover:scale-105 transition-all duration-200'
          >
            <ArrowLeft className='h-4 w-4' />
            Atrás
          </Button>
        </div>

        {}
        <div className='text-center space-y-2'>
          <div className='flex justify-center flex-wrap gap-4 sm:gap-8'>
            <div>
              <p className='text-sm text-gray-500'>Total Comisiones:</p>
              <p className='text-xl font-bold text-gray-900 dark:text-gray-100'>
                {totalCommissions}
              </p>
            </div>
            <div>
              <p className='text-sm text-gray-500'>Pendientes:</p>
              <p className='text-xl font-bold text-gray-900 dark:text-gray-100'>
                {pendingCommissionsCount}
              </p>
            </div>
            <div>
              <p className='text-sm text-gray-500'>Total Ganado:</p>
              <p className='text-xl font-bold text-gray-900 dark:text-gray-100'>
                {formatCurrencyCLP(totalAmount)}
              </p>
            </div>
            <div>
              <p className='text-sm text-gray-500'>Por Cobrar:</p>
              <p className='text-xl font-bold text-gray-900 dark:text-gray-100'>
                {formatCurrencyCLP(totalPendingAmount)}
              </p>
            </div>
          </div>

          <div className='flex justify-center gap-8 mt-4 pt-4 border-t border-gray-200'>
            <div>
              <p className='text-sm text-gray-500'>Resumen Detallado:</p>
              <p className='text-lg font-bold text-green-600'>
                {commissions.length} registros totales • {formatCurrencyCLP(totalAmount)}
              </p>
            </div>
          </div>
        </div>

        {}
        <FilterBar>
          <SortSelect
            field={sortField}
            direction={sortDirection}
            options={[
              { value: 'fecha_crea', label: 'Fecha' },
              { value: 'fecha_mod', label: 'Fecha de cobro' },
              { value: 'comision', label: 'Comisión' },
              { value: 'codigo', label: 'Código' },
              { value: 'tipo', label: 'Tipo' },
              { value: 'estado', label: 'Estado' },
              { value: 'id_comision', label: 'Número' }
            ]}
            onChange={(field, direction) => {
              setSortField(field as keyof Commission);
              setSortDirection(direction);
              setPage(1);
            }}
          />
          <SelectElements
            value={rowsPerPage}
            onChange={value => {
              setRowsPerPage(value);
              setPage(1);
            }}
            options={[5, 10, 25, 50]}
            label='Listar'
          />

          <div className='min-w-60'>
            <Label htmlFor='buscar-comisiones' className={SELECT_LABEL_CLASS}>
              Buscar
            </Label>
            <Input
              id='buscar-comisiones'
              type='text'
              placeholder='Buscar comisiones...'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={SELECT_INPUT_CLASS}
            />
          </div>
        </FilterBar>

        {}
        <ModuleTableCard>
          <CardContent className='p-0'>
            <div className='overflow-x-auto'>
              <ModuleTable>
                <ModuleTableHeader>
                  <ModuleTableRow>
                    <SortableTh
                      variant='module'
                      field='id_comision'
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    >
                      #
                    </SortableTh>
                    <SortableTh
                      variant='module'
                      field='codigo'
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    >
                      CÓDIGO (Venta/Serv.)
                    </SortableTh>
                    <SortableTh
                      variant='module'
                      field='comision'
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    >
                      COMISIÓN
                    </SortableTh>
                    <ModuleTableHead>TIPO</ModuleTableHead>
                    <SortableTh
                      variant='module'
                      field='fecha_crea'
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    >
                      FECHA
                    </SortableTh>
                    <ModuleTableHead>FECHA COBRO</ModuleTableHead>
                    <SortableTh
                      variant='module'
                      field='estado'
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    >
                      ESTADO
                    </SortableTh>
                  </ModuleTableRow>
                </ModuleTableHeader>
                <ModuleTableBody>
                  {paginatedCommissions.length === 0 ? (
                    <ModuleTableRow>
                      <ModuleTableCell colSpan={7}>
                        <EmptyState variant='text' title='No se encontraron comisiones' />
                      </ModuleTableCell>
                    </ModuleTableRow>
                  ) : (
                    paginatedCommissions.map((commission, index) => {
                      return (
                        <ModuleTableRow key={commission.id_comision}>
                          <ModuleTableCell>
                            <div className='w-8 h-8 bg-purple-300 text-white rounded-full flex items-center justify-center text-sm font-medium'>
                              {(page - 1) * rowsPerPage + index + 1}
                            </div>
                          </ModuleTableCell>
                          <ModuleTableCell>{commission.codigo || 'N/A'}</ModuleTableCell>
                          <ModuleTableCell>
                            {formatCurrencyCLP(commission.comision)}
                          </ModuleTableCell>
                          <ModuleTableCell>{commission.tipo || 'venta'}</ModuleTableCell>
                          <ModuleTableCell>
                            <div>
                              <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                                {formatDateTimeDmyLabel(commission.fecha_crea).date}
                              </div>
                              <div className='text-sm text-gray-500'>
                                {formatDateTimeDmyLabel(commission.fecha_crea).time}
                              </div>
                            </div>
                          </ModuleTableCell>
                          <ModuleTableCell>
                            {commission.fecha_mod ? (
                              <div>
                                <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                                  {formatDateTimeDmyLabel(commission.fecha_mod).date}
                                </div>
                                <div className='text-sm text-gray-500'>
                                  {formatDateTimeDmyLabel(commission.fecha_mod).time}
                                </div>
                              </div>
                            ) : (
                              <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800'>
                                Por cobrar
                              </span>
                            )}
                          </ModuleTableCell>
                          <ModuleTableCell>{getStatusBadge(commission.estado)}</ModuleTableCell>
                        </ModuleTableRow>
                      );
                    })
                  )}
                </ModuleTableBody>
              </ModuleTable>
            </div>
          </CardContent>
        </ModuleTableCard>

        {}
        <div className='flex justify-center'>
          <Paginate page={page} totalPages={totalPages} setPage={setPage} />
        </div>
      </BoneyardSkeleton>
    </div>
  );
}
