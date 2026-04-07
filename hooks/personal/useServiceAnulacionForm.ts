import React, { useState } from 'react';
import { ServicioWithDetails } from '@/types/servicio';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toastUtils';

interface UseServiceAnulacionFormProps {
  onOpenChange: (open: boolean) => void;
  servicio: ServicioWithDetails | null;
  onConfirm: () => void;
}

export function useServiceAnulacionForm({
  onOpenChange,
  servicio,
  onConfirm
}: UseServiceAnulacionFormProps) {
  const [motivo, setMotivo] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!motivo.trim()) {
      showErrorToast('Por favor ingrese un motivo para la anulación');
      return;
    }

    if (!servicio) {
      showErrorToast('No se ha seleccionado ningún servicio');
      return;
    }

    setIsLoading(true);

    try {
      // Llamar a la API en lugar de usar la función directamente
      const response = await fetch('/api/servicios/solicitud-anulacion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          servicioId: servicio.id_servicio,
          motivo
        })
      });

      const result = await response.json();

      if (result.success) {
        showSuccessToast('Solicitud de anulación enviada al administrador');
        setMotivo('');
        onOpenChange(false);
        onConfirm();
      } else {
        showErrorToast(result.error || 'Error al enviar la solicitud de anulación');
      }
    } catch (error) {
      console.error('Error al solicitar anulación:', error);
      showErrorToast('Error de conexión al enviar la solicitud');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setMotivo('');
    onOpenChange(false);
  };

  return {
    motivo,
    setMotivo,
    isLoading,
    handleSubmit,
    handleCancel
  };
}
