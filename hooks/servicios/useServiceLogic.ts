'use client';

import { useState, useCallback, useMemo } from 'react';
import { useServicios, useAllServicios } from '@/hooks/servicios/useServicios';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ServicioWithDetails } from '@/types/servicio';
import logger from '@/lib/utils/logger';

export function useServiceLogic() {
  const { servicios, loading, getServicios, removeServicioFromState, patchServicio, includeAll } =
    useServicios();

  
  const { servicios: allServicios, loading: loadingAll } = useAllServicios();

  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAllServices, setShowAllServices] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  const handleCreateServicio = useCallback(() => {
    router.push('/private-rooms/new');
  }, [router]);

  const handleShowActiveServices = useCallback(() => {
    setShowAllServices(false);
    setCurrentPage(1);
    
    getServicios(false);
  }, [getServicios]);

  const handleShowAllServices = useCallback(() => {
    setShowAllServices(true);
    setCurrentPage(1);
    
    getServicios(true);
  }, [getServicios]);

  const handleStopTimer = useCallback(
    async (servicioId: string | number) => {
      try {
        
        await patchServicio(servicioId, { estado: 1 }); 

        
        removeServicioFromState(servicioId);

        toast.success('Servicio finalizado exitosamente');
      } catch (error) {
        logger.captureException(error, { context: 'ServiceLogic:fetchServiceData' });
        toast.error('Error al finalizar el servicio');
      }
    },
    [patchServicio, removeServicioFromState]
  );

  const handleServiceFinalized = useCallback(
    (servicioId: string | number) => {
      removeServicioFromState(servicioId);
    },
    [removeServicioFromState]
  );

  const handleServiceAutoFinished = useCallback(async () => {
    try {
      await getServicios(false); 
      setCurrentPage(prev => prev);
    } catch (error) {
      logger.captureException(error, { context: 'ServiceLogic:handleServiceAutoFinished' });
      throw new Error('Error al actualizar servicios');
    }
  }, [getServicios, setCurrentPage]);

  const serviciosByStatus = useMemo(() => {
    if (!servicios || servicios.length === 0) return [];
    if (showAllServices) {
      
      return servicios.filter(
        (servicio: ServicioWithDetails) =>
          servicio.estado === 1 || servicio.estado === 0 || servicio.estado === 4
      );
    } else {
      
      return servicios.filter(
        (servicio: ServicioWithDetails) => servicio.estado === 2 || servicio.estado === 3
      );
    }
  }, [servicios, showAllServices]);

  const filteredServicios = useMemo(() => {
    if (!serviciosByStatus || serviciosByStatus.length === 0) return [];
    return serviciosByStatus.filter(
      (servicio: ServicioWithDetails) =>
        (servicio.codigo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (servicio.cliente_nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (servicio.habitacion_numero || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [serviciosByStatus, searchTerm]);
  const totalPages = Math.ceil(filteredServicios.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentServicios = filteredServicios.slice(startIndex, endIndex);

  return {
    servicios,
    allServicios,
    loading,
    loadingAll,
    searchTerm,
    showAllServices,
    currentPage,
    itemsPerPage,
    filteredServicios,
    currentServicios,
    totalPages,
    startIndex,
    endIndex,

    setSearchTerm,
    setCurrentPage,
    setItemsPerPage,

    handleCreateServicio,
    handleShowActiveServices,
    handleShowAllServices,
    handleStopTimer,
    handleServiceAutoFinished,
    handleServiceFinalized,

    includeAll,
    getServicios
  };
}
