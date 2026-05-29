import { useCallback, useRef } from 'react';
import { Timer } from '@/contexts/TimerContext';
import { toast } from 'sonner';
import { calculateRemainingTime } from '@/lib/utils/timeUtils';

import logger from '@/lib/utils/logger';
import { activeTimers, serverOffsetSignal, TimerInstance } from '@/lib/store/timerStore';

interface TimerActionsProps {
  onNotificationExpira: (timer: any) => void;
  onRefreshCaja?: (servicioId: string) => void;
}

export function useTimerActions({ onNotificationExpira, onRefreshCaja }: TimerActionsProps) {
  const updateRoomStatus = async (roomId: string, status: number) => {
    try {
      // Siempre liberamos/ocupamos la habitación sin condiciones
      await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: status === 2 ? 'occupy' : 'activate' })
      });
    } catch (e) {
      logger.captureException(e, { context: 'useTimerActions:updateRoomStatus' });
      // No mostramos toast para no molestar al usuario en cada operación
    }
  };

  const updateServiceStatus = async (servicioId: string, estado: number) => {
    try {
      await fetch(`/api/servicios/${servicioId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado })
      });
    } catch (e) {
      toast.error('Error actualizando servicio');
    }
  };

  const startTimer = useCallback(
    async (
      servicioId: string,
      roomId: string,
      roomName: string,
      duration: number,
      servicioCode: string,
      clienteNombre: string,
      anfitrionas?: string,
      tipoTransaccion: 'servicio' | 'venta' | 'cuenta' = 'servicio',
      waiterName?: string
    ) => {
      if (!servicioId || !roomId || !duration || duration <= 0) return;

      const currentOffset = serverOffsetSignal.peek();
      const startTime = new Date(Date.now() + currentOffset);
      const newT = new TimerInstance(
        {
          id: `timer_${roomId}_${servicioCode}_${Date.now()}`,
          servicioId,
          roomId,
          roomName,
          duration,
          startTime,
          isActive: true,
          isPaused: false,
          servicioCode,
          clienteNombre,
          tipoTransaccion,
          anfitrionas: anfitrionas || ''
        },
        duration * 60
      );

      activeTimers.value = [...activeTimers.peek(), newT];
      updateRoomStatus(roomId, 2);
      toast.success(`Temporizador iniciado para ${roomName}`);
    },
    []
  );

  const stopTimer = useCallback(
    async (timerId: string, isManualStop = false, timerObject?: any) => {
      const timer = timerObject || activeTimers.peek().find(t => t.id === timerId);
      if (!timer) return;

      const isInstance = timer instanceof TimerInstance;
      const tRoomId = isInstance ? (timer as TimerInstance).roomId.peek() : (timer as any).roomId;
      const tTipo = isInstance
        ? (timer as TimerInstance).tipoTransaccion.peek()
        : (timer as any).tipoTransaccion;

      activeTimers.value = activeTimers.peek().filter(t => t.id !== timerId);

      const othersInRoom = activeTimers
        .peek()
        .filter(t => t.roomId.peek() === tRoomId && t.id !== timerId && t.isActive.peek());
      const updates = [];

      if (tTipo === 'servicio') {
        updates.push(updateServiceStatus(timer.servicioId, 1));
      } else if (tTipo === 'venta') {
        updates.push(
          fetch(`/api/ventas/${timer.servicioId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'stop' })
          })
        );
      } else if (tTipo === 'cuenta') {
        updates.push(fetch(`/api/cuentas/${timer.servicioId}/stop`, { method: 'PATCH' }));
      }

      if (othersInRoom.length === 0) {
        updates.push(updateRoomStatus(tRoomId, 1));
      }

      await Promise.all(updates);

      setTimeout(() => {
        if (onRefreshCaja) onRefreshCaja(timer.servicioId);
        window.dispatchEvent(new CustomEvent('updateSales'));
      }, 100);

      const tRoomName = isInstance
        ? (timer as TimerInstance).roomName.peek()
        : (timer as any).roomName;
      if (isManualStop) toast.success(`Habitación ${tRoomName} liberada`);
    },
    [onRefreshCaja]
  );

  const pauseTimerByServicioId = useCallback((servicioId: string) => {
    const target = activeTimers.peek().find(t => t.servicioId === servicioId && !t.isTemporary);
    if (target) {
      target.isPaused.value = true;
      updateServiceStatus(servicioId, 3);
    }
  }, []);

  const resumeTimerByServicioId = useCallback((servicioId: string) => {
    const target = activeTimers.peek().find(t => t.servicioId === servicioId && !t.isTemporary);
    if (target) {
      target.isPaused.value = false;
      updateServiceStatus(servicioId, 2);
    }
  }, []);

  const startTemporaryTimer = useCallback(
    (
      servicioId: string,
      roomId: string,
      roomName: string,
      duration: number,
      servicioCode: string,
      clienteNombre: string,
      onComplete: () => void,
      datosTemporales?: any,
      anfitrionas?: string
    ) => {
      const current = activeTimers.peek();
      if (current.some(t => t.servicioId === servicioId && t.isTemporary)) return;

      const normalizedServicioId = String(servicioId);
      const normalizedRoomId = String(roomId);
      const main = current.find(
        t => String(t.servicioId) === normalizedServicioId && !t.isTemporary
      );
      const mainRemainingTimeAtPause = main?.remainingSeconds.peek() ?? duration * 60;
      const mergedDatosTemporales = {
        ...datosTemporales,
        tiempo_principal_congelado: mainRemainingTimeAtPause,
        habitacion_principal: main?.roomName.peek() || roomName,
        codigo_principal: main?.servicioCode.peek() || servicioCode,
        estado_principal: 'PAUSADO'
      };

      const temporaryTimer = new TimerInstance(
        {
          id: `temp_timer_${servicioId}_${Date.now()}`,
          servicioId,
          roomId,
          roomName,
          duration,
          isActive: true,
          isPaused: false,
          startTime: new Date(),
          servicioCode: `${servicioCode}-TEMP`,
          clienteNombre,
          isTemporary: true,
          datosTemporales: mergedDatosTemporales,
          tipoTransaccion: 'servicio',
          anfitrionas: anfitrionas || '',
          onExpire: () => onComplete()
        },
        duration * 60
      );

      // Pausamos TODO timer principal de la misma habitación para garantizar
      // que no haya dos servicios corriendo en paralelo en una habitación.
      const roomMainTimers = current.filter(
        t => String(t.roomId.peek()) === normalizedRoomId && !t.isTemporary
      );
      roomMainTimers.forEach(t => {
        t.isPaused.value = true;
        updateServiceStatus(String(t.servicioId), 3);
      });

      if (roomMainTimers.length === 0 && main) {
        main.isPaused.value = true;
        updateServiceStatus(String(main.servicioId), 3);
      }

      // Garantía de negocio: el servicio principal SIEMPRE debe quedar pausado en backend,
      // incluso si no fue encontrado en el estado local por desincronización temporal.
      updateServiceStatus(normalizedServicioId, 3);

      activeTimers.value = [...current, temporaryTimer];
      toast.info(`Timer temporal: ${duration} mins`);
    },
    []
  );

  return {
    startTimer,
    stopTimer,
    pauseTimerByServicioId,
    resumeTimerByServicioId,
    startTemporaryTimer
  };
}
