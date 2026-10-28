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
import { ArrowLeft, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import SelectElements from '@/components/shared/SelectElements';
import Paginate from '@/components/shared/Paginate';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateLabel, formatDateTimeDmyLabel } from '@/lib/utils/calendarUtils';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { useAnfitrionaServicios, type Service } from '@/hooks/hostess/useAnfitrionaServicios';
import { Label } from '@/components/ui/label';

function getStatusBadge(estado: number) {
  switch (estado) {
    case 0:
      return (
        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800'>
          Anulado
        </span>
      );
    case 1:
      return (
        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'>
          Finalizado
        </span>
      );
    case 2:
      return (
        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800'>
          En proceso
        </span>
      );
    case 3:
      return (
        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800'>
          Pausado
        </span>
      );
    case 4:
      return (
        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800'>
          Solicitud anulación
        </span>
      );
    default:
      return (
        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'>
          Desconocido
        </span>
      );
  }
}

export default function AnfitrionaServiciosPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const {
    loading,
    error,
    fetchServices,
    searchTerm,
    rowsPerPage,
    page,
    sortField,
    sortDirection,
    statusFilter,
    totalServices,
    totalEarnings,
    serviciosEnProceso,
    serviciosFinalizados,
    serviciosAnulados,
    serviciosPausados,
    solicitudesAnulacion,
    paginatedServices,
    totalPages,
    setSearchTerm,
    setRowsPerPage,
    setPage,
    setStatusFilter,
    handleSort,
    setSort
  } = useAnfitrionaServicios(!userLoading && user?.role?.toLowerCase() === 'anfitriona');

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

  if (error) return <ListLoadError message={error} onRetry={fetchServices} />;

  return (
    <div className='p-6 space-y-6'>
      <div className='flex justify-between items-center'>
        <div>
          <p className='text-sm text-gray-500'>LAS MUÑECAS DE RAMÓN</p>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
            Listado de Servicios {user?.name} {user?.lastName}
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

      <div className='text-center space-y-2'>
        <div className='flex justify-center gap-8 flex-wrap'>
          <div>
            <p className='text-sm text-gray-500'>Total Servicios:</p>
            <p className='text-xl font-bold text-gray-900 dark:text-white'>{totalServices}</p>
          </div>
          <div>
            <p className='text-sm text-gray-500'>Finalizados:</p>
            <p className='text-xl font-bold text-green-600'>{serviciosFinalizados}</p>
          </div>
          <div>
            <p className='text-sm text-gray-500'>En Proceso:</p>
            <p className='text-xl font-bold text-blue-600'>{serviciosEnProceso}</p>
          </div>
          <div>
            <p className='text-sm text-gray-500'>Pausados:</p>
            <p className='text-xl font-bold text-yellow-600'>{serviciosPausados}</p>
          </div>
          <div>
            <p className='text-sm text-gray-500'>S. Anulación:</p>
            <p className='text-xl font-bold text-orange-600'>{solicitudesAnulacion}</p>
          </div>
          <div>
            <p className='text-sm text-gray-500'>Anulados:</p>
            <p className='text-xl font-bold text-red-600'>{serviciosAnulados}</p>
          </div>
          <div>
            <p className='text-sm text-gray-500'>Total Ganado:</p>
            <p className='text-xl font-bold text-gray-900 dark:text-white'>
              {formatCurrencyCLP(totalEarnings)}
            </p>
          </div>
        </div>
      </div>

      <FilterBar>
        <div className='min-w-64'>
          <span className={SELECT_LABEL_CLASS}>Estado</span>
          <Tabs
            value={statusFilter}
            onValueChange={value => {
              setStatusFilter(value as 'proceso' | 'finalizados');
              setPage(1);
            }}
            className='w-full'
          >
            <TabsList
              aria-label='Estado del servicio'
              className='grid w-full grid-cols-2 bg-white/50 dark:bg-black/20 p-1 rounded-full border shadow-xs h-11'
            >
              <TabsTrigger
                value='proceso'
                className='rounded-full px-4 py-2 data-[state=active]:bg-black data-[state=active]:text-white transition-all duration-200'
              >
                En Proceso
              </TabsTrigger>
              <TabsTrigger
                value='finalizados'
                className='rounded-full px-4 py-2 data-[state=active]:bg-black data-[state=active]:text-white transition-all duration-200'
              >
                Finalizados
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <SortSelect
          field={sortField}
          direction={sortDirection}
          options={[
            { value: 'fecha_crea', label: 'Fecha' },
            { value: 'codigo', label: 'Código' },
            { value: 'cliente', label: 'Cliente' },
            { value: 'tiempo', label: 'Tiempo' },
            { value: 'habitacion', label: 'Habitación' },
            { value: 'comision_usuario', label: 'Mi comisión' },
            { value: 'estado', label: 'Estado' },
            { value: 'id_servicio', label: 'Número' }
          ]}
          onChange={(field, direction) => setSort(field as keyof Service, direction)}
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
          <Label htmlFor='buscar-servicios' className={SELECT_LABEL_CLASS}>
            Buscar
          </Label>
          <Input
            id='buscar-servicios'
            type='text'
            placeholder='Buscar servicios...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={SELECT_INPUT_CLASS}
          />
        </div>
      </FilterBar>

      <ModuleTableCard>
        <CardContent className='p-0'>
          <div className='overflow-x-auto'>
            <ModuleTable>
              <ModuleTableHeader>
                <ModuleTableRow>
                  {[
                    { field: 'id_servicio' as const, label: '#' },
                    { field: 'codigo' as const, label: 'CÓDIGO' },
                    { field: 'cliente' as const, label: 'CLIENTE' },
                    { field: 'tiempo' as const, label: 'TIEMPO' },
                    { field: 'habitacion' as const, label: 'HABITACIÓN' },
                    { field: 'comision_usuario' as const, label: 'MI COMISIÓN' },
                    { field: 'fecha_crea' as const, label: 'FECHA HORA' },
                    { field: 'estado' as const, label: 'ESTADO' }
                  ].map(col => (
                    <ModuleTableHead key={col.field}>
                      <Button
                        variant='unstyled'
                        onClick={() => handleSort(col.field)}
                        className='flex w-full items-center justify-center gap-1 hover:text-foreground'
                      >
                        {col.label}
                        {sortField === col.field ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className='h-4 w-4' />
                          ) : (
                            <ChevronDown className='h-4 w-4' />
                          )
                        ) : (
                          <ChevronUp className='h-4 w-4 opacity-0' />
                        )}
                      </Button>
                    </ModuleTableHead>
                  ))}
                </ModuleTableRow>
              </ModuleTableHeader>
              <ModuleTableBody>
                {loading ? (
                  <ModuleTableRow>
                    <ModuleTableCell colSpan={8}>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto'></div>
                      <p className='mt-2 text-gray-600'>Cargando servicios...</p>
                    </ModuleTableCell>
                  </ModuleTableRow>
                ) : paginatedServices.length === 0 ? (
                  <ModuleTableRow>
                    <ModuleTableCell colSpan={8}>
                      <EmptyState variant='text' title='No se encontraron servicios' />
                    </ModuleTableCell>
                  </ModuleTableRow>
                ) : (
                  paginatedServices.map((service, index) => (
                    <ModuleTableRow key={service.id_servicio}>
                      <ModuleTableCell>
                        <div className='w-8 h-8 bg-purple-300 text-white rounded-full flex items-center justify-center text-sm font-medium'>
                          {(page - 1) * rowsPerPage + index + 1}
                        </div>
                      </ModuleTableCell>
                      <ModuleTableCell>{service.codigo || 'N/A'}</ModuleTableCell>
                      <ModuleTableCell>{service.cliente || 'N/A'}</ModuleTableCell>
                      <ModuleTableCell>{service.tiempo || 'N/A'}</ModuleTableCell>
                      <ModuleTableCell>{service.habitacion || 'N/A'}</ModuleTableCell>
                      <ModuleTableCell>
                        {formatCurrencyCLP(service.comision_usuario)}
                      </ModuleTableCell>
                      <ModuleTableCell>
                        <div>
                          <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                            {formatDateTimeDmyLabel(service.fecha_crea).date}
                          </div>
                          <div className='text-sm text-gray-500'>
                            {formatDateTimeDmyLabel(service.fecha_crea).time}
                          </div>
                        </div>
                      </ModuleTableCell>
                      <ModuleTableCell>{getStatusBadge(service.estado)}</ModuleTableCell>
                    </ModuleTableRow>
                  ))
                )}
              </ModuleTableBody>
            </ModuleTable>
          </div>
        </CardContent>
      </ModuleTableCard>

      <div className='flex justify-center'>
        <Paginate page={page} totalPages={totalPages} setPage={setPage} />
      </div>
    </div>
  );
}
