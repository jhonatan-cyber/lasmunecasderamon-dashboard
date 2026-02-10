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
import { useEffect } from 'react';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';

export default function ServiciosPage() {
  const { habitaciones } = useHabitaciones();
  const { hasOpenCaja, loading: cajaLoading } = useCashRegisterStatus();
  const { setRefreshCallback } = useTimer();
  const { hasPermission } = useUserPermissions();
  
  const canCreate = hasPermission('privados', 'crear');
  const canEdit = hasPermission('privados', 'editar');
  const canFinalize = hasPermission('privados', 'finalizar');
  
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
    <PermissionGuard module="privados" action="listar">
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-4 sm:mb-6'>
          <div>
            <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900'>
              Servicios Privados
            </h1>
            <p className='text-sm sm:text-base text-gray-600 mt-2'>
              Gestiona los servicios privados y habitaciones VIP
            </p>
          </div>
          {canCreate && (
            <Button
              onClick={handleCreateServicioWithCheck}
              disabled={cajaLoading || !hasOpenCaja}
              variant='outline'
              className={`whitespace-nowrap inline-flex items-center rounded-full transition-all duration-200 text-sm sm:text-base w-full sm:w-auto px-4 sm:px-6 py-2 ${
                hasOpenCaja
                  ? 'bg-black text-white hover:scale-105'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              size='sm'
            >
              {cajaLoading ? (
                <>
                  <div className='animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-gray-500 mr-1' />
                  Verificando...
                </>
              ) : hasOpenCaja ? (
                <>
                  <Plus className='w-3 h-3 sm:w-4 sm:h-4 mr-1' />
                  Nuevo
                </>
              ) : (
                <>
                  <AlertCircle className='w-3 h-3 sm:w-4 sm:h-4 mr-1' />
                  Sin Caja
                </>
              )}
            </Button>
          )}
        </div>

      {/* Estadísticas de servicios */}
      <ServiceStats servicios={servicios} habitaciones={habitaciones} />

      {/* Mensaje de advertencia cuando no hay caja abierta */}
      {!cajaLoading && hasOpenCaja === false && (
        <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
          <div className='flex items-center'>
            <AlertCircle className='h-5 w-5 text-yellow-600 mr-2' />
            <div>
              <h3 className='text-sm font-medium text-yellow-800'>Caja cerrada</h3>
              <p className='text-sm text-yellow-700 mt-1'>
                No se pueden crear nuevos servicios sin una caja abierta. Por favor, abra una caja
                en el módulo de caja primero.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className='bg-white rounded-lg shadow-sm border p-4 sm:p-6'>
        {/* Filtros */}
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

        {/* Lista de servicios */}
        {loading ? (
          <div className='flex justify-center items-center h-32 sm:h-64'>
            <div className='text-gray-500 text-sm sm:text-base'>Cargando servicios...</div>
          </div>
        ) : (
          <>
            {showAllServices && (
              <div className='mb-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg'>
                <p className='text-blue-800 text-xs sm:text-sm'>
                  <strong>Mostrando servicios terminados:</strong> Solo servicios con estado
                  "Terminado"
                </p>
              </div>
            )}

            <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
              {currentServicios.map(servicio => (
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
