'use client';

import { useEffect, useCallback } from 'react';
import { ServicioWithDetails } from '@/types/servicio';
import { useServiceFormValidation } from '@/hooks/servicios/useServiceFormValidation';
import { useServiceMutations } from '@/hooks/servicios/useServiceMutations';

interface UseEditServiceFormProps {
  open: boolean;
  servicio: ServicioWithDetails | null;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
  onPauseMainTimer?: () => void;
  onResumeMainTimer?: () => void;
  onTemporaryTimerComplete?: (nuevasAnfitrionas: string) => void;
}

export function useEditServiceForm({
  open,
  servicio,
  onOpenChange,
  onUpdate,
  onPauseMainTimer,
  onResumeMainTimer,
  onTemporaryTimerComplete
}: UseEditServiceFormProps) {
  const {
    formData,
    precioServicioDisplay,
    precioHabitacionDisplay,
    precioHabitacionSinComision,
    numAnfitrionasSeleccionadas,
    pricing,
    handlePrecioServicioChange,
    handleMetodoPagoChange,
    handleTiempoChange,
    handleUsuariosChange,
    initFormForServicio
  } = useServiceFormValidation({ open, servicio });

  const {
    isSaving,
    anfitrionasDisponibles,
    anfitrionasDelServicio,
    loadingAnfitrionas,
    handleSave,
    handleClose,
    fetchAnfitrionasParaEdicion
  } = useServiceMutations({
    open,
    servicio,
    onOpenChange,
    onUpdate,
    onPauseMainTimer,
    onResumeMainTimer,
    onTemporaryTimerComplete,
    formData,
    pricing
  });

  useEffect(() => {
    if (servicio && open) {
      initFormForServicio(servicio);

      const servicioRawId = servicio.id_servicio ?? servicio.id;
      if (servicioRawId) {
        fetchAnfitrionasParaEdicion(String(servicioRawId)).then(usuarios => {
          handleUsuariosChange(usuarios);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicio?.id_servicio, servicio?.id, open]);

  return {
    formData,
    isSaving,
    anfitrionasDisponibles,
    anfitrionasDelServicio,
    loadingAnfitrionas,
    precioServicioDisplay,
    precioHabitacionDisplay,
    precioHabitacionSinComision,
    numAnfitrionasSeleccionadas,
    pricing,
    handlePrecioServicioChange,
    handleMetodoPagoChange,
    handleTiempoChange,
    handleUsuariosChange,
    handleClose,
    handleSave,
    numAnfitrionasOriginal: servicio?.total_usuarios || 1
  };
}
