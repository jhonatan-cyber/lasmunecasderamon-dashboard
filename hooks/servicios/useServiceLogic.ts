'use client';

import { useState, useCallback, useMemo } from 'react';
import { useServicios } from '@/hooks/servicios/useServicios';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function useServiceLogic() {
  const { servicios, loading, getServicios, removeServicioFromState } = useServicios();
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
  }, []);

  const handleShowAllServices = useCallback(() => {
    setShowAllServices(true);
    setCurrentPage(1);
  }, []);

  const handleStopTimer = useCallback(
    async (servicioId: number) => {
      try {
        const response = await fetch(`/api/servicios/${servicioId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ estado: 0 })
        });

        if (response.ok) {
          removeServicioFromState(servicioId);
          await getServicios(true);
          toast.success('Servicio finalizado exitosamente');
        } else {
          toast.error('Error al finalizar el servicio');
        }
      } catch (error) {
        toast.error('Error al finalizar el servicio');
      }
    },
    [removeServicioFromState, getServicios]
  );

  const handleServiceFinalized = useCallback((servicioId: number) => {

    removeServicioFromState(servicioId);
  }, [removeServicioFromState]);
  const handleServiceAutoFinished = useCallback(async () => {

    try {
      await getServicios(true);
      setCurrentPage(prev => prev);
    } catch (error) {
      throw new Error('Error al actualizar servicios');
    }
  }, [getServicios, setCurrentPage]);

  const serviciosByStatus = useMemo(() => {
    if (showAllServices) {
      // Mostrar servicios terminados (1) o anulados (0)
      return servicios.filter(servicio => servicio.estado === 1 || servicio.estado === 0);
    } else {
      // Mostrar servicios en proceso (2) o pausados (3)
      return servicios.filter(servicio => servicio.estado === 2 || servicio.estado === 3);
    }
  }, [servicios, showAllServices]);

  const filteredServicios = useMemo(() => {
    return serviciosByStatus.filter(
      servicio =>
        servicio.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        servicio.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        servicio.habitacion_numero?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [serviciosByStatus, searchTerm]);
  const totalPages = Math.ceil(filteredServicios.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentServicios = filteredServicios.slice(startIndex, endIndex);

  return {

    servicios,
    loading,
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

    getServicios: (p0: boolean) => getServicios(true)
  };
}
