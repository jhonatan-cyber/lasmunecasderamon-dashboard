'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useHabitaciones } from '@/hooks/habitaciones/useHabitaciones';
import ServicioCard from '@/components/servicios/ServicioCard';
import Paginate from '@/components/shared/Paginate';
import ServiceStats from '@/components/servicios/ServiceStats';
import ServiceFilters from '@/components/servicios/ServiceFilters';
import { ServiceStatusTabs } from '@/components/servicios/ServiceStatusTabs';
import { ServiceDetailModal } from '@/components/servicios/ServiceDetailModal';
import { useServiceLogic } from '@/hooks/servicios/useServiceLogic';
import { useCashRegisterStatus } from '@/hooks/caja/useCashRegisterStatus';
import { useTimer } from '@/contexts/TimerContext';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRefreshOnFocus } from '@/hooks/shared';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { ServicioWithDetails } from '@/types/servicio';
import { CajaStatusBanner } from '@/components/sales/CajaStatusBanner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function ServiciosPage() {
  const { getHabitaciones } = useHabitaciones();
  const { hasOpenCaja, loading: cajaLoading } = useCashRegisterStatus();
  const { setRefreshCallback } = useTimer();
  const { hasPermission } = useUserPermissions();

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedServicio, setSelectedServicio] = useState<ServicioWithDetails | null>(null);

  const canCreate = hasPermission('private_rooms', 'create');

  const {
    servicios,
    allServicios,
    loading,
    loadingAll,
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
    getServicios,
    includeAll
  } = useServiceLogic();

  const handleServiceFinalizedRef = useRef(handleServiceFinalized);
  const handleServiceAutoFinishedRef = useRef(handleServiceAutoFinished);

  useEffect(() => {
    handleServiceFinalizedRef.current = handleServiceFinalized;
  }, [handleServiceFinalized]);

  useEffect(() => {
    handleServiceAutoFinishedRef.current = handleServiceAutoFinished;
  }, [handleServiceAutoFinished]);

  useEffect(() => {
    setRefreshCallback((servicioId?: string | number) => {
      if (servicioId) {
        const numericId = typeof servicioId === 'string' ? servicioId : String(servicioId);
        handleServiceFinalizedRef.current(numericId as any);
      }

      handleServiceAutoFinishedRef.current();
    });
  }, [setRefreshCallback]);

  const refreshServicesAndRooms = useCallback(async () => {
    await Promise.all([getServicios(), getHabitaciones()]);
  }, [getHabitaciones, getServicios]);

  useRefreshOnFocus(refreshServicesAndRooms);

  const handleShowServiceDetail = (servicio: ServicioWithDetails) => {
    if (showAllServices) {
      setSelectedServicio(servicio);
      setDetailModalOpen(true);
    }
  };

  return (
    <PermissionGuard module='private_rooms' action='view'>
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <CajaStatusBanner entityName='servicios privados' />

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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className='w-full sm:w-auto block sm:inline'>
                    <Button
                      onClick={handleCreateServicio}
                      disabled={cajaLoading || !hasOpenCaja}
                      className='whitespace-nowrap inline-flex items-center rounded-full px-6 py-2 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto bg-black text-white hover:bg-white/90 hover:text-black dark:hover:bg-white dark:hover:text-black hover:scale-105 shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-white disabled:dark:hover:bg-black disabled:dark:hover:text-white disabled:hover:scale-100'
                    >
                      {cajaLoading ? (
                        <>
                          <div className='animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-gray-500 mr-1' />
                          Verificando...
                        </>
                      ) : (
                        <>
                          <Plus className='w-3 h-3 sm:w-4 sm:h-4 mr-1' />
                          Nuevo Servicio
                        </>
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!hasOpenCaja && !cajaLoading && (
                  <TooltipContent>
                    <p>Caja cerrada</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {}
        {loading || loadingAll ? (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className='h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse'
              />
            ))}
          </div>
        ) : (
          <ServiceStats servicios={allServicios} />
        )}

        {}
        <div className='bg-transparent p-0'>
          <ServiceFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            setCurrentPage={setCurrentPage}
            onRefresh={() => getServicios(includeAll)}
          />

          {}
          <ServiceStatusTabs
            showAllServices={showAllServices}
            onShowActiveServices={handleShowActiveServices}
            onShowAllServices={handleShowAllServices}
          />

          {}
          {showAllServices && (
            <div className='mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl flex items-center gap-3'>
              <div className='w-2 h-2 rounded-full bg-blue-500 animate-pulse' />
              <p className='text-blue-800 dark:text-blue-300 text-xs sm:text-sm font-medium'>
                <strong>Historial:</strong> Mostrando únicamente servicios finalizados
              </p>
            </div>
          )}

          {}
          <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
            {currentServicios.map((servicio: any, index: number) => (
              <ServicioCard
                key={String(servicio.id_servicio ?? servicio.id ?? 'servicio-')}
                servicio={servicio}
                onStopTimer={handleStopTimer}
                onUpdate={() => getServicios(includeAll)}
                showAllServices={showAllServices}
                onShowDetail={handleShowServiceDetail}
              />
            ))}
          </div>

          {}
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
        </div>

        {}
        <ServiceDetailModal
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          servicio={selectedServicio}
        />
      </div>
    </PermissionGuard>
  );
}
