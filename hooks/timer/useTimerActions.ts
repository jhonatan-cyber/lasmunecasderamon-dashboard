import { useCallback, useRef } from 'react';
import { Timer } from '@/contexts/TimerContext';
import { toast } from 'sonner';
import { calculateRemainingTime } from '@/lib/utils/timeUtils';

import { activeTimers, serverOffsetSignal, TimerInstance } from '@/lib/store/timerStore';

interface TimerActionsProps {
  onNotificationExpira: (timer: any) => void;
  onRefreshCaja?: (servicioId: string) => void;
}

export function useTimerActions({
  onNotificationExpira,
  onRefreshCaja
}: TimerActionsProps) {

  // --- API HELPERS ---
  const updateRoomStatus = async (roomId: string, status: number) => {
    try {
      const roomRes = await fetch(`/api/rooms/${roomId}`);
      const { success, data } = await roomRes.json();
      if (!success) return;

      const hasPrice = data.price > 0, hasTime = data.time > 0, hasComm = data.comision_anfitriona > 0;
      if (!hasPrice && !hasTime && !hasComm) return;

      await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: status === 2 ? 'occupy' : 'activate' })
      });
    } catch (e) { toast.error('Error actualizando habitación'); }
  };

  const updateServiceStatus = async (servicioId: string, estado: number) => {
    try {
      await fetch(`/api/servicios/${servicioId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado })
      });
    } catch (e) { toast.error('Error actualizando servicio'); }
  };

  // --- ACTIONS ---
  const startTimer = useCallback(async (
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
    const currentTimers = activeTimers.peek();
    if (currentTimers.some(t => t.roomId.peek() === roomId && t.servicioCode.peek() === servicioCode)) return;
    if (!servicioId || !roomId || !duration || duration <= 0) return;

    const newT = new TimerInstance({
      id: `timer_${roomId}_${servicioCode}_${Date.now()}`,
      servicioId, roomId, roomName, duration,
      startTime: new Date(),
      isActive: true, isPaused: false,
      servicioCode, clienteNombre, tipoTransaccion,
      anfitrionas: anfitrionas || ''
    }, duration * 60);

    activeTimers.value = [...currentTimers, newT];
    updateRoomStatus(roomId, 2);
    toast.success(`Temporizador iniciado para ${roomName}`);
  }, []);

  const stopTimer = useCallback(async (timerId: string, isManualStop = false, timerObject?: any) => {
    const timer = timerObject || activeTimers.peek().find(t => t.id === timerId);
    if (!timer) return;

    const isInstance = timer instanceof TimerInstance;
    const tRoomId = isInstance ? (timer as TimerInstance).roomId.peek() : (timer as any).roomId;
    const tTipo = isInstance ? (timer as TimerInstance).tipoTransaccion.peek() : (timer as any).tipoTransaccion;

    // Quitar del store de señales
    activeTimers.value = activeTimers.peek().filter(t => t.id !== timerId);

    const othersInRoom = activeTimers.peek().filter(t => t.roomId.peek() === tRoomId && t.id !== timerId && t.isActive.peek());
    const updates = [];

    if (tTipo === 'servicio') {
      updates.push(updateServiceStatus(timer.servicioId, 1));
    } else if (tTipo === 'venta') {
      updates.push(fetch(`/api/ventas/${timer.servicioId}/stop`, { method: 'PATCH' }));
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

    const tRoomName = isInstance ? (timer as TimerInstance).roomName.peek() : (timer as any).roomName;
    if (isManualStop) toast.success(`Habitación ${tRoomName} liberada`);
  }, [onRefreshCaja]);

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
        // El motor de señales (loop central) se encargará del resto basado en startTime
        updateServiceStatus(servicioId, 2);
    }
  }, []);

  const startTemporaryTimer = useCallback((
    servicioId: string, roomId: string, roomName: string, duration: number,
    servicioCode: string, clienteNombre: string, onComplete: () => void,
    datosTemporales?: any, anfitrionas?: string
  ) => {
    const current = activeTimers.peek();
    if (current.some(t => t.servicioId === servicioId && t.isTemporary)) return;

    const temporaryTimer = new TimerInstance({
      id: `temp_timer_${servicioId}_${Date.now()}`,
      servicioId, roomId, roomName, duration,
      isActive: true, isPaused: false,
      startTime: new Date(), servicioCode: `${servicioCode}-TEMP`,
      clienteNombre, isTemporary: true,
      tipoTransaccion: 'servicio', anfitrionas: anfitrionas || ''
    }, duration * 60);

    // Pausamos el principal
    const main = current.find(t => t.servicioId === servicioId && !t.isTemporary);
    if (main) main.isPaused.value = true;

    activeTimers.value = [...current, temporaryTimer];
    toast.info(`Timer temporal: ${duration} mins`);
  }, []);

  return {
    startTimer,
    stopTimer,
    pauseTimerByServicioId,
    resumeTimerByServicioId,
    startTemporaryTimer
  };
}
