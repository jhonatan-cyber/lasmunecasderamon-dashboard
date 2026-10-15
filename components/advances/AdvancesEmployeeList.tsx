'use client';
import { SortSelect } from '@/components/shared/selects/SortSelect';
import { FilterBar } from '@/components/shared/FilterBar';

import { Input } from '@/components/ui/input';
import { SELECT_INPUT_CLASS, SELECT_LABEL_CLASS } from '@/components/shared/selectStyles';

import { useState, useEffect, useCallback } from 'react';

import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import SelectElements from '@/components/shared/SelectElements';
import Paginate from '@/components/shared/Paginate';
import logger from '@/lib/utils/logger';
import { EmployeeAdvanceRequests } from './EmployeeAdvanceRequests';
import { EmployeeAdvancesTable, type EmployeeAdvance } from './EmployeeAdvancesTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, Wallet, AlertCircle } from 'lucide-react';

type Advance = EmployeeAdvance;

const ADVANCE_SORT_BY_OPTIONS = [
  { value: 'fecha_crea', label: 'Fecha solicitud' },
  { value: 'fecha_mod', label: 'Fecha pago' },
  { value: 'monto', label: 'Monto' }
];

interface Props {
  allowedRole: string;
  title?: string;
}

export function AdvancesEmployeeList({ allowedRole, title }: Props) {
  const { user, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('listado');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('fecha_crea');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchAdvances = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/anticipos/user');
      const data = await res.json();
      if (res.ok && data.success) {
        setAdvances(
          (data.data || [])
            .filter((row: Advance) => Number(row.estado) === 0)
            .map((row: Advance) => ({
              ...row,
              estado: Number(row.estado),
              monto: Number(row.monto)
            }))
        );
      } else {
        throw new Error(data.message || 'No se pudieron cargar los anticipos.');
      }
    } catch (error) {
      logger.captureException(error, { context: `AdvancesEmployeeList:fetchAdvances` });
      setError(error instanceof Error ? error.message : 'No se pudieron cargar los anticipos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && !userLoading && user.role?.toLowerCase() === allowedRole) {
      fetchAdvances();
    }
  }, [user, userLoading, fetchAdvances, allowedRole]);

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

  const filteredAdvances = advances.filter(advance => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      advance.monto.toString().includes(term) ||
      (advance.motivo || '').toLowerCase().includes(term);
    return matchesSearch;
  });

  const sortedAdvances = [...filteredAdvances].sort((a, b) => {
    let aValue: any = a[sortBy as keyof Advance];
    let bValue: any = b[sortBy as keyof Advance];

    if (sortBy === 'fecha_crea' || sortBy === 'fecha_mod') {
      aValue = new Date(aValue || 0).getTime();
      bValue = new Date(bValue || 0).getTime();
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
  const paginatedAdvances = sortedAdvances.slice(startIndex, endIndex);
  const totalPages = Math.ceil(sortedAdvances.length / rowsPerPage);

  const totalToPay = advances
    .filter(advance => advance.estado === 0)
    .reduce((sum, advance) => sum + (advance.monto || 0), 0);

  const deliveredOnly = true;
  const filterControls = (
    <>
      <div>
        <label htmlFor='buscar-anticipos' className={SELECT_LABEL_CLASS}>
          Buscar
        </label>
        <Input
          id='buscar-anticipos'
          type='search'
          placeholder='Monto o motivo...'
          value={searchTerm}
          onChange={event => {
            setSearchTerm(event.target.value);
            setCurrentPage(1);
          }}
          className={SELECT_INPUT_CLASS}
        />
      </div>
      <SortSelect
        field={sortBy}
        direction={sortOrder}
        options={ADVANCE_SORT_BY_OPTIONS}
        onChange={(field, direction) => {
          setSortBy(field);
          setSortOrder(direction);
          setCurrentPage(1);
        }}
      />
      <SelectElements
        value={rowsPerPage}
        onChange={value => {
          setRowsPerPage(value);
          setCurrentPage(1);
        }}
        options={[5, 10, 20, 50]}
        label='Elementos por página'
      />
    </>
  );
  const listContent = error ? (
    <div
      role='alert'
      className='flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300'
    >
      <p className='flex items-center gap-2'>
        <AlertCircle className='h-4 w-4' aria-hidden='true' />
        {error}
      </p>
      <Button
        type='button'
        variant='outline'
        className='rounded-full'
        onClick={() => void fetchAdvances()}
      >
        Reintentar
      </Button>
    </div>
  ) : (
    <div className='space-y-5'>
      <EmployeeAdvancesTable
        advances={paginatedAdvances}
        count={filteredAdvances.length}
        startIndex={startIndex}
        total={totalToPay}
        loading={loading}
        deliveredOnly={deliveredOnly}
      />
      {totalPages > 1 && (
        <div className='flex justify-center'>
          <Paginate page={currentPage} totalPages={totalPages} setPage={setCurrentPage} />
        </div>
      )}
    </div>
  );

  return (
    <div className='space-y-6 p-4 sm:p-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div className='space-y-1'>
          <h1 className='text-2xl font-bold text-foreground'>{title || 'Mis anticipos'}</h1>
          <p className='text-sm text-muted-foreground'>
            {deliveredOnly
              ? 'Consulta tus anticipos entregados y gestiona tus solicitudes.'
              : 'Consulta el historial y el estado de tus anticipos.'}
          </p>
        </div>
        <Button
          type='button'
          variant='outline'
          onClick={() => router.back()}
          className='rounded-full px-5'
        >
          <ArrowLeft className='mr-2 h-4 w-4' />
          Atrás
        </Button>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-5'>
        <FilterBar>
          <div className='min-w-72 flex-none!'>
            <TabsList
              aria-label='Mis anticipos'
              className='grid h-11 w-full grid-cols-2 rounded-full bg-gray-100 p-1 dark:bg-slate-900/60'
            >
              <TabsTrigger
                value='listado'
                className='h-9 gap-2 rounded-full px-4 data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black'
              >
                <Wallet className='h-4 w-4' aria-hidden='true' />
                {deliveredOnly ? 'Entregados' : 'Anticipos'}
              </TabsTrigger>
              <TabsTrigger
                value='solicitudes'
                className='h-9 gap-2 rounded-full px-4 data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black'
              >
                <ClipboardList className='h-4 w-4' aria-hidden='true' />
                Solicitudes
              </TabsTrigger>
            </TabsList>
          </div>
          {activeTab === 'listado' && filterControls}
        </FilterBar>
        <TabsContent value='listado' className='mt-0'>
          {listContent}
        </TabsContent>
        <TabsContent value='solicitudes' className='mt-0'>
          <EmployeeAdvanceRequests onRequested={fetchAdvances} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
