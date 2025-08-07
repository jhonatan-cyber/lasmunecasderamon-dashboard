'use client';

import { Button } from '@/components/ui/button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { useHabitaciones } from '@/hooks/useHabitaciones';
import ServicioCard from '@/components/servicios/ServicioCard';
import Paginate from '@/components/ui/paginate';
import ServiceStats from '@/components/servicios/ServiceStats';
import ServiceFilters from '@/components/servicios/ServiceFilters';
import { useServiceLogic } from '@/hooks/useServiceLogic';

export default function ServiciosPage() {
  const { habitaciones } = useHabitaciones();
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
    handleStopTimer
  } = useServiceLogic();

  return (
    <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-4 sm:mb-6'>
        <div>
          <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900'>Servicios Privados</h1>
          <p className='text-sm sm:text-base text-gray-600 mt-2'>Gestiona los servicios privados y habitaciones VIP</p>
        </div>
        <Button
          onClick={handleCreateServicio}
          variant='outline'
          className='whitespace-nowrap inline-flex items-center bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto px-4 sm:px-6 py-2'
          size='sm'
        >
          <FontAwesomeIcon icon={faPlus} className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
          Nuevo
        </Button>
      </div>

      {/* Estadísticas de servicios */}
      <ServiceStats servicios={servicios} habitaciones={habitaciones} />

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
                  <strong>Mostrando servicios terminados:</strong> Solo servicios con estado "Terminado"
                </p>
              </div>
            )}

            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6'>
              {currentServicios.map(servicio => (
                <ServicioCard
                  key={servicio.id_servicio}
                  servicio={servicio}
                  onStopTimer={handleStopTimer}
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
                <div className="flex justify-center">
                  <Paginate page={currentPage} totalPages={totalPages} setPage={setCurrentPage} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
