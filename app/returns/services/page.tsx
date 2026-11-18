'use client';

import { useEffect, useState, useCallback } from 'react';
import { useServicios } from '@/hooks/services/useServicios';
import { useDevolucionFilters } from '@/hooks/services/useDevolucionFilters';
import { useDevolucionLogic } from '@/hooks/services/useDevolucionLogic';
import { useDevolucionResponse } from '@/hooks/services/useDevolucionResponse';
import { useServicioTimerSync } from '@/hooks/services/useServicioTimerSync';
import { useAnulacionContext } from '@/contexts/AnulacionContext';
import { useTimer } from '@/contexts/TimerContext';
import { Button } from '@/components/ui/button';
import Paginate from '@/components/shared/Paginate';
import { ServicioDetailModal } from '@/components/services/ServicioDetailModal';
import { anfitrionaColors, metodoPagoLabels } from '@/lib/business/salesUtils';
import { DevolucionHeader } from '@/components/returns/DevolucionHeader';
import { DevolucionFilters } from '@/components/returns/DevolucionFilters';
import { DevolucionServiciosTable } from '@/components/returns/services/DevolucionServiciosTable';
import { AnulacionServicioModal } from '@/components/returns/services/AnulacionServicioModal';
import { ErrorState } from '@/components/shared/ErrorState';
import logger from '@/lib/utils/logger';

export default function DevolucionesServiciosPage() {
  const { servicios, loading, error, getServicios } = useServicios();
  const { filters, updateFilter, clearFilters } = useDevolucionFilters();
  const {
    selectedServicio,
    isDetailModalOpen,
    isAnulacionModalOpen,
    setIsDetailModalOpen,
    setIsAnulacionModalOpen,
    handleVerDetalles,
    handleAnularServicio,
    handleConfirmarAnulacion
  } = useDevolucionLogic();

  const { setRefreshCallback } = useAnulacionContext();
  const { setRefreshCallback: setTimerRefreshCallback } = useTimer();

  useServicioTimerSync();

  const [showAnulados, setShowAnulados] = useState(false);

  const updateCallback = useCallback(() => {
    logger.info('🔄 Actualizando servicios después de anulación');
    getServicios();
  }, [getServicios]);

  const timerUpdateCallback = useCallback(() => {
    logger.info('🔄 Actualizando servicios después de timer terminado');
  }, []);

  useEffect(() => {
    setRefreshCallback(() => updateCallback);
    setTimerRefreshCallback(() => timerUpdateCallback);
  }, [updateCallback, timerUpdateCallback, setRefreshCallback, setTimerRefreshCallback]);

  const serviciosFiltrados = showAnulados
    ? servicios.filter(servicio => servicio.estado === 3)
    : servicios.filter(servicio => servicio.estado === 1 || servicio.estado === 2);

  const filteredServicios = serviciosFiltrados.filter(servicio => {
    const matchesSearch =
      filters.searchTerm === '' ||
      servicio.codigo?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      servicio.cliente_nombre?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      servicio.habitacion_numero?.toString().includes(filters.searchTerm);

    const matchesPayment =
      filters.paymentFilter === 'all' || servicio.metodo_pago === filters.paymentFilter;

    return matchesSearch && matchesPayment;
  });

  const totalPages = Math.ceil(filteredServicios.length / filters.rowsPerPage);
  const startIndex = (filters.currentPage - 1) * filters.rowsPerPage;
  const endIndex = startIndex + filters.rowsPerPage;
  const paginatedServicios = filteredServicios.slice(startIndex, endIndex);

  useEffect(() => {
    getServicios();
  }, [getServicios]);

  if (error) {
    return (
      <div className='p-4 sm:p-6 lg:p-8 space-y-6'>
        <ErrorState message={`Error al cargar los servicios: ${error}`} size='sm' />
      </div>
    );
  }

  return (
    <div className='p-4 sm:p-6 lg:p-8 space-y-6'>
      <DevolucionHeader title='Devoluciones de Servicios' variant='solid' />

      <DevolucionFilters
        filters={filters}
        updateFilter={updateFilter}
        clearFilters={clearFilters}
      />

      <div className='space-y-4'>
        <div className='flex justify-end'>
          <Button
            variant={showAnulados ? 'default' : 'outline-solid'}
            size='sm'
            onClick={() => setShowAnulados(!showAnulados)}
            className='w-full rounded-full bg-black px-4 py-2 text-sm text-white transition-all duration-200 hover:scale-105 sm:w-auto sm:text-base'
          >
            {showAnulados ? 'Ver Activos' : 'Ver Anulados'}
          </Button>
        </div>

        <DevolucionServiciosTable
          servicios={paginatedServicios}
          loading={loading}
          showAnularButton={!showAnulados}
          onVerDetalles={handleVerDetalles}
          onAnularServicio={handleAnularServicio}
        />

        {totalPages > 1 && (
          <div className='flex justify-center'>
            <Paginate
              page={filters.currentPage}
              totalPages={totalPages}
              setPage={page => updateFilter('currentPage', page)}
            />
          </div>
        )}
      </div>

      {}
      <ServicioDetailModal
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        selectedServicio={selectedServicio}
        anfitrionaColors={anfitrionaColors}
        metodoPagoLabels={metodoPagoLabels}
      />

      {}
      <AnulacionServicioModal
        open={isAnulacionModalOpen}
        onOpenChange={setIsAnulacionModalOpen}
        servicio={selectedServicio}
        onConfirm={() => handleConfirmarAnulacion(getServicios)}
      />
    </div>
  );
}
