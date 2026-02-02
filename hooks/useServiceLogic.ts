'use client';

import { useState, useCallback, useMemo } from 'react';
import { useServicios } from '@/hooks/useServicios';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function useServiceLogic() {
  const { servicios, loading, getServicios, removeServicioFromState } = useServicios();
  const router = useRouter();

  // Estados de filtros y paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllServices, setShowAllServices] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  // Handlers
  const handleCreateServicio = useCallback(() => {
    router.push('/private-rooms/new');
  }, [router]);

  const handleShowActiveServices = useCallback(() => {
    setShowAllServices(false);
    setCurrentPage(1);
    // No recargar datos, solo cambiar el filtro local
  }, []);

  const handleShowAllServices = useCallback(() => {
    setShowAllServices(true);
    setCurrentPage(1);
    // No recargar datos, solo cambiar el filtro local
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
          // Actualizar el estado local inmediatamente
          removeServicioFromState(servicioId);
          // También recargar todos los datos para asegurar consistencia
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

  // Función para remover un servicio finalizado del estado local
  const handleServiceFinalized = useCallback((servicioId: number) => {
    console.log('🗑️ Removiendo servicio finalizado del estado local:', servicioId);
    removeServicioFromState(servicioId);
  }, [removeServicioFromState]);
  const handleServiceAutoFinished = useCallback(async () => {
    console.log('🔄 handleServiceAutoFinished ejecutado');
    
    // Recargar inmediatamente sin setTimeout para evitar delays
    try {
      console.log('🔄 Recargando servicios después de finalización automática');
      await getServicios(true);
      console.log('✅ Servicios recargados exitosamente');
      
      // Forzar re-render actualizando el estado
      setCurrentPage(prev => prev);
    } catch (error) {
      console.error('❌ Error al recargar servicios:', error);
    }
  }, [getServicios, setCurrentPage]);

  // Filtrar servicios por estado (activos vs terminados)
  const serviciosByStatus = useMemo(() => {
    if (showAllServices) {
      // Mostrar solo servicios terminados (estado 0)
      const serviciosTerminados = servicios.filter(servicio => servicio.estado === 0);

      return serviciosTerminados;
    } else {
      // Mostrar solo servicios activos (estado 1)
      const serviciosActivos = servicios.filter(servicio => servicio.estado === 1);

      return serviciosActivos;
    }
  }, [servicios, showAllServices]);

  // Filtrado de servicios por término de búsqueda
  const filteredServicios = useMemo(() => {
    return serviciosByStatus.filter(
      servicio =>
        servicio.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        servicio.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        servicio.habitacion_numero?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [serviciosByStatus, searchTerm]);

  // Cálculos de paginación
  const totalPages = Math.ceil(filteredServicios.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentServicios = filteredServicios.slice(startIndex, endIndex);

  return {
    // Estados
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

    // Setters
    setSearchTerm,
    setCurrentPage,
    setItemsPerPage,

    // Handlers
    handleCreateServicio,
    handleShowActiveServices,
    handleShowAllServices,
    handleStopTimer,
    handleServiceAutoFinished,
    handleServiceFinalized,

    // Acciones de datos
    getServicios: () => getServicios(true)
  };
}
