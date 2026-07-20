'use client';

import { useCallback } from 'react';
import { useTimer } from '@/contexts/TimerContext';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toastUtils';

export const useDevolucionResponse = () => {
  const { stopTimerByServicioId, resumeTimerByServicioId } = useTimer();

  const handleDevolucionConfirmada = useCallback(
    async (servicioId: number) => {
      try {
        stopTimerByServicioId(String(servicioId));

        showSuccessToast('Devolución confirmada. Temporizador finalizado y habitación liberada.');
      } catch {
        showErrorToast('Error al finalizar el temporizador');
      }
    },
    [stopTimerByServicioId]
  );

  const handleDevolucionRechazada = useCallback(
    async (servicioId: number) => {
      try {
        resumeTimerByServicioId(String(servicioId));
        showSuccessToast(
          'Devolución rechazada. El servicio continúa activo y el temporizador se ha reanudado.'
        );
      } catch {
        showErrorToast('Error al procesar el rechazo');
      }
    },
    [resumeTimerByServicioId]
  );

  return {
    handleDevolucionConfirmada,
    handleDevolucionRechazada
  };
};
