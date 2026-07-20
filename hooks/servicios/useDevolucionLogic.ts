'use client';

import { useState } from 'react';
import { ServicioWithDetails } from '@/types/servicio';
import { showErrorToast } from '@/lib/utils/toastUtils';
import { useTimer } from '@/contexts/TimerContext';

export const useDevolucionLogic = () => {
  const [selectedServicio, setSelectedServicio] = useState<ServicioWithDetails | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAnulacionModalOpen, setIsAnulacionModalOpen] = useState(false);

  const handleVerDetalles = (servicio: ServicioWithDetails) => {
    setSelectedServicio(servicio);
    setIsDetailModalOpen(true);
  };

  const handleAnularServicio = (servicio: ServicioWithDetails) => {
    setSelectedServicio(servicio);
    setIsAnulacionModalOpen(true);
  };

  const handleConfirmarAnulacion = async (getServicios: () => Promise<void>) => {
    if (!selectedServicio) {
      showErrorToast('No se ha seleccionado ningún servicio');
      return;
    }

    try {
      setIsAnulacionModalOpen(false);
      setSelectedServicio(null);

      await getServicios();

      setTimeout(() => {}, 500);
    } catch (error) {
      let errorMessage = 'Error al procesar la anulación del servicio';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'details' in error) {
        errorMessage = (error as any).details || errorMessage;
      }

      showErrorToast(errorMessage);
    }
  };

  const resetAnulacionModal = () => {
    setIsAnulacionModalOpen(false);
    setSelectedServicio(null);
  };

  return {
    selectedServicio,
    isDetailModalOpen,
    isAnulacionModalOpen,
    setIsDetailModalOpen,
    setIsAnulacionModalOpen,
    handleVerDetalles,
    handleAnularServicio,
    handleConfirmarAnulacion,
    resetAnulacionModal
  };
};
