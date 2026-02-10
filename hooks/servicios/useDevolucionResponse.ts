import { useCallback } from 'react';
import { useTimer } from '@/contexts/TimerContext';
import { showSuccessToast, showErrorToast } from '@/lib/toastUtils';

export const useDevolucionResponse = () => {
  const { stopTimerByServicioId, resumeTimerByServicioId } = useTimer();

  const handleDevolucionConfirmada = useCallback(
    async (servicioId: number) => {
      try {
        // Finalizar el temporizador del servicio
        await stopTimerByServicioId(servicioId);

        showSuccessToast('Devolución confirmada. Temporizador finalizado y habitación liberada.');
      } catch (error) {
        showErrorToast('Error al finalizar el temporizador');
      }
    },
    [stopTimerByServicioId]
  );

  const handleDevolucionRechazada = useCallback(
    async (servicioId: number) => {
      try {
        // Reanudar el temporizador del servicio
        resumeTimerByServicioId(servicioId);
        showSuccessToast(
          'Devolución rechazada. El servicio continúa activo y el temporizador se ha reanudado.'
        );
      } catch (error) {
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
