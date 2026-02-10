import { useState } from 'react';
import { ServicioWithDetails } from '@/types/servicio';
import { showSuccessToast, showErrorToast } from '@/lib/toastUtils';
import { useTimer } from '@/contexts/TimerContext';
import { solicitarAnulacionServicio } from '@/lib/serviciosUtils';

export const useDevolucionLogic = () => {
  const [selectedServicio, setSelectedServicio] = useState<ServicioWithDetails | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAnulacionModalOpen, setIsAnulacionModalOpen] = useState(false);
  const { stopTimerByServicioId, pauseTimerByServicioId } = useTimer();

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

      // Pequeño delay para asegurar que el hook de sincronización se ejecute después
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
