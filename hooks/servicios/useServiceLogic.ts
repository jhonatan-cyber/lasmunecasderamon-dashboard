'use client';

import { useState, useCallback, useMemo } from 'react';
import { useServicios, useAllServicios } from '@/hooks/servicios/useServicios';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ServicioWithDetails } from '@/types/servicio';

export function useServiceLogic() {
  const { servicios, loading, getServicios, removeServicioFromState, patchServicio } =
    useServicios();

  // Obtener todos los servicios (sin filtro por estado) para los stats
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
    // TambiÃ©n recargar con all=false para obtener activos
    getServicios(false);
  }, [getServicios]);

  const handleShowAllServices = useCallback(() => {
    setShowAllServices(true);
    setCurrentPage(1);
    // Recargar con all=true para obtener finalizados
    getServicios(true);
  }, [getServicios]);

  const handleStopTimer = useCallback(
    async (servicioId: number) => {
      try {
        // Usar patchServicio que ya implementa actualizaciones optimistas
        await patchServicio(servicioId, { estado: 1 }); // 1 = Terminado

        // Remover del estado local inmediatamente para que desaparezca de la vista
        removeServicioFromState(servicioId);

        toast.success('Servicio finalizado exitosamente');
      } catch (error) {
        console.error('[useServiceLogic] Error al finalizar:', error);
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
      await getServicios(false); // false = obtener servicios activos
      setCurrentPage(prev => prev);
    } catch (error) {
      console.error('[useServiceLogic] Error en handleServiceAutoFinished:', error);
      throw new Error('Error al actualizar servicios');
    }
  }, [getServicios, setCurrentPage]);

  const serviciosByStatus = useMemo(() => {
    if (!servicios || servicios.length === 0) return [];
    if (showAllServices) {
      // Mostrar servicios finalizados (1) o anulados (0)
      return servicios.filter(
        (servicio: ServicioWithDetails) => servicio.estado === 1 || servicio.estado === 0
      );
    } else {
      // Mostrar servicios en proceso (2), pausados (3) o solicitud de anulaciÃ³n (4)
      return servicios.filter(
        (servicio: ServicioWithDetails) =>
          servicio.estado === 2 || servicio.estado === 3 || servicio.estado === 4
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

    getServicios: (p0: boolean) => getServicios(true)
  };
}
