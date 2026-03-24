/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console */
'use client';

import { Button } from '@/components/ui/button';
import { Plus, AlertCircle } from 'lucide-react';
import { useHabitaciones } from '@/hooks/habitaciones/useHabitaciones';
import ServicioCard from '@/components/servicios/ServicioCard';
import Paginate from '@/components/ui/paginate';
import ServiceStats from '@/components/servicios/ServiceStats';
import ServiceFilters from '@/components/servicios/ServiceFilters';
import { useServiceLogic } from '@/hooks/servicios/useServiceLogic';
import { useCashRegisterStatus } from '@/hooks/caja/useCashRegisterStatus';
import { useTimer } from '@/contexts/TimerContext';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatsCardSkeleton, CardSkeleton } from '@/components/ui/skeletons';

export default function ServiciosPage() {
  const { habitaciones, loading: habitacionLoading } = useHabitaciones();
  const { hasOpenCaja, loading: cajaLoading } = useCashRegisterStatus();
  const { setRefreshCallback } = useTimer();
  const { hasPermission } = useUserPermissions();

  const canCreate = hasPermission('private_rooms', 'create');
  const canEdit = hasPermission('private_rooms', 'edit');
  const canFinalize = hasPermission('private_rooms', 'finalize');

  const {
    servicios,
    loading,
    searchTerm,
    setSearchTerm,
    showAllServices,
    currentPage,
    itemsPerPage,
    currentServicios,
    totalPages,
    startIndex,
    endIndex,
    setCurrentPage,
    setItemsPerPage,
    handleCreateServicio,
    handleShowActiveServices,
    handleShowAllServices,
    handleStopTimer,
    handleServiceAutoFinished,
    handleServiceFinalized,
    getServicios
  } = useServiceLogic();

  // Configurar callback de actualización para cuando termine un timer
  useEffect(() => {
    console.log('🔧 Configurando refreshCallback');
    setRefreshCallback(() => (servicioId?: number) => {
      console.log('🔄 RefreshCallback llamado desde TimerContext, servicioId:', servicioId);

      // Si tenemos el ID del servicio, removerlo del estado local inmediatamente
      if (servicioId) {
        handleServiceFinalized(servicioId);
      }

      // Luego recargar todos los datos
      handleServiceAutoFinished();
    });
  }, [setRefreshCallback, handleServiceAutoFinished, handleServiceFinalized]);

  const handleCreateServicioWithCheck = () => {
    if (!hasOpenCaja) {
      toast.error(
        'No se puede crear un servicio sin caja abierta. Por favor, abra una caja primero.'
      );
      return;
    }
    handleCreateServicio();
  };

  return (
    <PermissionGuard module='private_rooms' action='view'>
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        {/* Header estándar del sistema */}
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-6'>
          <div>
            <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900'>
              Servicios Privados
            </h1>
            <p className='text-sm sm:text-base text-gray-600 mt-2'>
              Gestiona los registros de servicios del sistema
            </p>
          </div>
          {canCreate && (
            <Button
              onClick={handleCreateServicioWithCheck}
              disabled={cajaLoading || !hasOpenCaja}
              className={`whitespace-nowrap inline-flex items-center rounded-full transition-all duration-200 text-sm sm:text-base w-full sm:w-auto px-4 sm:px-6 py-2 ${
                hasOpenCaja
                  ? 'bg-black text-white hover:scale-105 shadow-md dark:hover:bg-zinc-800'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {cajaLoading ? (
                <>
                  <div className='animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-gray-500 mr-1' />
                  Verificando...
                </>
              ) : hasOpenCaja ? (
                <>
                  <Plus className='w-3 h-3 sm:w-4 sm:h-4 mr-1' />
                  Nuevo Registro
                </>
              ) : (
                <>
                  <AlertCircle className='w-3 h-3 sm:w-4 sm:h-4 mr-1' />
                  Caja Cerrada
                </>
              )}
            </Button>
          )}
        </div>

        {/* Estadísticas de servicios */}
        {loading ? (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
            {[...Array(4)].map((_, i) => (
              <StatsCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <ServiceStats servicios={servicios} />
        )}

        {/* List Content */}
        <div className='bg-transparent p-0'>
          <ServiceFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            showAllServices={showAllServices}
            onShowActiveServices={handleShowActiveServices}
            onShowAllServices={handleShowAllServices}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            setCurrentPage={setCurrentPage}
          />

          {/* Pestañas de estado - Centradas */}
          <div className='flex justify-center mb-10'>
            <Tabs
              value={showAllServices ? 'finished' : 'active'}
              onValueChange={value => {
                if (value === 'active') handleShowActiveServices();
                else handleShowAllServices();
              }}
              className='w-full sm:w-auto'
            >
              <TabsList className='grid w-full grid-cols-2 bg-gray-100/80 dark:bg-zinc-800/50 p-1.5 rounded-2xl border border-gray-200 dark:border-zinc-700 shadow-md h-14'>
                <TabsTrigger
                  value='active'
                  className='rounded-xl px-10 sm:px-16 py-3 text-sm sm:text-base font-bold data-[state=active]:bg-black dark:data-[state=active]:bg-white data-[state=active]:text-white dark:data-[state=active]:text-black transition-all duration-300 shadow-sm'
                >
                  En Proceso
                </TabsTrigger>
                <TabsTrigger
                  value='finished'
                  className='rounded-xl px-10 sm:px-16 py-3 text-sm sm:text-base font-bold data-[state=active]:bg-black dark:data-[state=active]:bg-white data-[state=active]:text-white dark:data-[state=active]:text-black transition-all duration-300 shadow-sm'
                >
                  Finalizados
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {loading ? (
            <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6'>
              {[...Array(6)].map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <>
              {showAllServices && (
                <div className='mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl flex items-center gap-3'>
                  <div className='w-2 h-2 rounded-full bg-blue-500 animate-pulse' />
                  <p className='text-blue-800 dark:text-blue-300 text-xs sm:text-sm font-medium'>
                    <strong>Historial:</strong> Mostrando únicamente servicios finalizados
                  </p>
                </div>
              )}

              <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
                {currentServicios.map((servicio: any) => (
                  <ServicioCard
                    key={servicio.id_servicio}
                    servicio={servicio}
                    onStopTimer={handleStopTimer}
                    onUpdate={() => getServicios(true)}
                    showAllServices={showAllServices}
                  />
                ))}
              </div>

              {/* Paginación */}
              {currentServicios.length > 0 && totalPages > 1 && (
                <div className='mt-4 sm:mt-6'>
                  <div className='flex justify-between items-center text-xs sm:text-sm text-gray-600 mb-4'>
                    <div>
                      Mostrando {startIndex + 1} a {Math.min(endIndex, currentServicios.length)} de{' '}
                      {currentServicios.length} servicios
                    </div>
                  </div>
                  <div className='flex justify-center'>
                    <Paginate page={currentPage} totalPages={totalPages} setPage={setCurrentPage} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PermissionGuard>
  );
}

