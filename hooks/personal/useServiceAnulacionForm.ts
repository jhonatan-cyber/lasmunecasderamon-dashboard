'use client';

import React, { useRef, useState } from 'react';
import { ServicioWithDetails } from '@/types/servicio';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toastUtils';
import logger from '@/lib/utils/logger';

interface UseServiceAnulacionFormProps {
  onOpenChange: (open: boolean) => void;
  servicio: ServicioWithDetails | null;
  onConfirm: () => void | Promise<void>;
}

export function useServiceAnulacionForm({
  onOpenChange,
  servicio,
  onConfirm
}: UseServiceAnulacionFormProps) {
  const [motivo, setMotivo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const submitting = useRef(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting.current) return;

    if (!motivo.trim()) {
      showErrorToast('Por favor ingrese un motivo para la anulación');
      return;
    }

    if (!servicio) {
      showErrorToast('No se ha seleccionado ningún servicio');
      return;
    }

    submitting.current = true;
    setIsLoading(true);

    try {
      const response = await fetch('/api/servicios/solicitud-anulacion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          servicioId: servicio.id_servicio,
          motivo: motivo.trim()
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showSuccessToast('Solicitud de anulación enviada al administrador');
        setMotivo('');
        onOpenChange(false);
        try {
          await onConfirm();
        } catch {
          showErrorToast(
            'La solicitud fue enviada, pero no se pudo actualizar la lista de servicios'
          );
        }
      } else {
        showErrorToast(
          result.error?.message ||
            result.error ||
            result.message ||
            'Error al enviar la solicitud de anulación'
        );
      }
    } catch (error) {
      logger.captureException(error, { context: 'ServiceAnulacionForm:submitAnulacion' });
      showErrorToast('Error de conexión al enviar la solicitud');
    } finally {
      submitting.current = false;
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (submitting.current) return;
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
