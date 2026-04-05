/* eslint-disable */
'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useServicios } from '@/hooks/servicios/useServicios';
import { useDevolucionFilters } from '@/hooks/servicios/useDevolucionFilters';
import { useDevolucionLogic } from '@/hooks/servicios/useDevolucionLogic';
import { useDevolucionResponse } from '@/hooks/servicios/useDevolucionResponse';
import { useServicioTimerSync } from '@/hooks/servicios/useServicioTimerSync';
import { useAnulacionContext } from '@/contexts/AnulacionContext';
import { useTimer } from '@/contexts/TimerContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Paginate from '@/components/shared/Paginate';
import { ServicioDetailModal } from '@/components/servicios/ServicioDetailModal';
import { anfitrionaColors, metodoPagoLabels } from '@/lib/business/salesUtils';
import { DevolucionHeader } from '@/components/returns/services/DevolucionHeader';
import { DevolucionFilters } from '@/components/returns/services/DevolucionFilters';
import { DevolucionTable } from '@/components/returns/services/DevolucionTable';
import { AnulacionModal } from '@/components/returns/services/AnulacionModal';

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

  // Sincronizar temporizadores con el estado de servicios
  useServicioTimerSync();

  // Estado para mostrar servicios anulados
  const [showAnulados, setShowAnulados] = useState(false);

  // Configurar callback de actualización para el contexto de anulación
  const updateCallback = useCallback(() => {
    console.log('🔄 Actualizando servicios después de anulación');
    getServicios();
  }, [getServicios]);

  // Configurar callback de actualización para cuando termine un timer
  const timerUpdateCallback = useCallback(() => {
    console.log('🔄 Actualizando servicios después de timer terminado');
    // Actualizar solo los datos sin recargar la página
    // Los datos se actualizarán automáticamente cuando el timer termine
  }, []);

  // Refs para callbacks estables
  const updateCallbackRef = useRef(updateCallback);
  const timerUpdateCallbackRef = useRef(timerUpdateCallback);

  useEffect(() => {
    updateCallbackRef.current = updateCallback;
  }, [updateCallback]);

  useEffect(() => {
    timerUpdateCallbackRef.current = timerUpdateCallback;
  }, [timerUpdateCallback]);

  useEffect(() => {
    setRefreshCallback(() => updateCallbackRef.current);
  }, [setRefreshCallback]);

  useEffect(() => {
    setTimerRefreshCallback(() => timerUpdateCallbackRef.current);
  }, [setTimerRefreshCallback]);

  // Filtrar servicios según el estado seleccionado
  const serviciosFiltrados = showAnulados
    ? servicios.filter(servicio => servicio.estado === 3) // Solo anulados
    : servicios.filter(servicio => servicio.estado === 1 || servicio.estado === 2); // Activos y pendientes

  // Filtrar por término de búsqueda y método de pago
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

  // Calcular paginación
  const totalPages = Math.ceil(filteredServicios.length / filters.rowsPerPage);
  const startIndex = (filters.currentPage - 1) * filters.rowsPerPage;
  const endIndex = startIndex + filters.rowsPerPage;
  const paginatedServicios = filteredServicios.slice(startIndex, endIndex);

  useEffect(() => {
    // En la página de devoluciones, obtener también servicios con estado 2 y 3
    getServicios();
  }, []);

  if (error) {
    return (
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
          <p className='text-red-800 text-sm sm:text-base'>
            Error al cargar los servicios: {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
      <DevolucionHeader />

      <DevolucionFilters
        filters={filters}
        updateFilter={updateFilter}
        clearFilters={clearFilters}
      />

      <Card className='shadow-sm sm:shadow-md'>
        <CardHeader className='pb-4 sm:pb-6'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4'>
            <CardTitle className='text-lg sm:text-xl lg:text-2xl'>
              {showAnulados ? 'Servicios Anulados' : 'Servicios Activos'} (
              {filteredServicios.length})
            </CardTitle>
            <Button
              variant={showAnulados ? 'default' : 'outline'}
              size='sm'
              onClick={() => setShowAnulados(!showAnulados)}
              className='w-full sm:w-auto bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base px-4 py-2'
            >
              {showAnulados ? 'Ver Activos' : 'Ver Anulados'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className='p-4 sm:p-6'>
          <div className='overflow-x-auto'>
            <DevolucionTable
              servicios={paginatedServicios}
              loading={loading}
              showAnularButton={!showAnulados}
              onVerDetalles={handleVerDetalles}
              onAnularServicio={handleAnularServicio}
            />
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className='mt-4 sm:mt-6 flex justify-center'>
              <Paginate
                page={filters.currentPage}
                totalPages={totalPages}
                setPage={page => updateFilter('currentPage', page)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalles */}
      <ServicioDetailModal
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        selectedServicio={selectedServicio}
        anfitrionaColors={anfitrionaColors}
        metodoPagoLabels={metodoPagoLabels}
      />

      {/* Modal de Anulación */}
      <AnulacionModal
        open={isAnulacionModalOpen}
        onOpenChange={setIsAnulacionModalOpen}
        servicio={selectedServicio}
        onConfirm={() => handleConfirmarAnulacion(getServicios)}
      />
    </div>
  );
}
