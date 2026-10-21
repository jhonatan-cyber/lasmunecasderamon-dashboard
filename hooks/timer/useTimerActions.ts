'use client';

import { useCallback, useEffect, useRef } from 'react';
import { refreshTimerSnapshot } from '@/lib/store/timerSnapshot';
import { toast } from 'sonner';

import logger from '@/lib/utils/logger';
import { activeTimers, TimerInstance } from '@/lib/store/timerStore';

interface TimerActionsProps {
  onNotificationExpira: (timer: any) => void;
  onRefreshCaja?: (servicioId: string) => void;
}

export function useTimerActions({ onNotificationExpira, onRefreshCaja }: TimerActionsProps) {
  // El aviso de "ventas actualizadas" viaja con un temporizador corto. Si el
  // componente se desmonta antes de que dispare, el temporizador queda vivo y
  // revienta contra un `window` que ya no existe. Se limpia al desmontar.
  const avisoDeVenta = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (avisoDeVenta.current) clearTimeout(avisoDeVenta.current);
    },
    []
  );

  const updateRoomStatus = async (roomId: string, status: number) => {
    try {
      await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: status === 2 ? 'occupy' : 'activate' })
      });
    } catch (e) {
      logger.captureException(e, { context: 'useTimerActions:updateRoomStatus' });
    }
  };

  const updateServiceStatus = async (servicioId: string, estado: number) => {
    try {
      const response = await fetch(`/api/servicios/${servicioId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado })
      });
      if (!response.ok) throw new Error('No se pudo actualizar el temporizador');
    } catch (e) {
      toast.error('Error actualizando servicio');
      throw e;
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

      try {
        await refreshTimerSnapshot(true);
      } catch (error) {
        logger.captureException(error, { context: 'useTimerActions:startTimer' });
        toast.error('No se pudo sincronizar el temporizador');
        return;
      }
      if (tipoTransaccion !== 'venta') updateRoomStatus(roomId, 2);
      toast.success(`Temporizador iniciado para ${roomName}`);
    },
    []
  );

  const stopTimer = useCallback(
    async (timerId: string, isManualStop = false, timerObject?: any) => {
      const timer = timerObject || activeTimers.peek().find(t => t.id === timerId);
      if (!timer) return;

      // El vencimiento lo resuelve el servidor, también para sesiones de solo lectura.
      // Un PATCH manual desde cada navegador puede fallar por permisos o competir con el cron.
      if (timerObject && !isManualStop) {
        await refreshTimerSnapshot(true, true);
        onRefreshCaja?.(timer.servicioId);
        return;
      }

      const requireSuccess = async (response: Response, fallback: string) => {
        const body = await response.json().catch(() => null);
        if (!response.ok || body?.success === false)
          throw new Error(
            body?.error?.message || body?.message || `${fallback} (HTTP ${response.status})`
          );
      };

      const isInstance = timer instanceof TimerInstance;
      const tRoomId = isInstance ? (timer as TimerInstance).roomId.peek() : (timer as any).roomId;
      const tTipo = isInstance
        ? (timer as TimerInstance).tipoTransaccion.peek()
        : (timer as any).tipoTransaccion;

      const othersInRoom = activeTimers
        .peek()
        .filter(t => t.roomId.peek() === tRoomId && t.id !== timerId && t.isActive.peek());
      const updates = [];

      if (tTipo === 'servicio') {
        updates.push(
          fetch(`/api/servicios/${timer.servicioId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: 1 })
          }).then(response => requireSuccess(response, 'No se pudo finalizar el servicio'))
        );
      } else if (tTipo === 'venta') {
        updates.push(
          fetch(`/api/sales/${timer.servicioId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'stop' })
          }).then(response => requireSuccess(response, 'No se pudo finalizar la venta'))
        );
      } else if (tTipo === 'cuenta') {
        updates.push(
          fetch(`/api/cuentas/${timer.servicioId}/stop`, { method: 'PATCH' }).then(response =>
            requireSuccess(response, 'No se pudo finalizar la cuenta')
          )
        );
      }

      if (othersInRoom.length === 0 && tTipo !== 'servicio' && tTipo !== 'venta') {
        updates.push(updateRoomStatus(tRoomId, 1));
      }

      await Promise.all(updates);
      activeTimers.value = activeTimers.peek().filter(t => t.id !== timerId);

      if (avisoDeVenta.current) clearTimeout(avisoDeVenta.current);
      avisoDeVenta.current = setTimeout(() => {
        avisoDeVenta.current = null;
        if (onRefreshCaja) onRefreshCaja(timer.servicioId);
        // El aviso es un efecto de la vista: fuera del navegador no hay
        // `window` que despachar y no debe romper el proceso.
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('updateSales'));
      }, 100);

      const tRoomName = isInstance
        ? (timer as TimerInstance).roomName.peek()
        : (timer as any).roomName;
      if (isManualStop) toast.success(`Temporizador de ${tRoomName} finalizado`);
    },
    [onRefreshCaja]
  );

  const pauseTimerByServicioId = useCallback((servicioId: string) => {
    const target = activeTimers.peek().find(t => t.servicioId === servicioId && !t.isTemporary);
    if (target) {
      void updateServiceStatus(servicioId, 3)
        .then(() => refreshTimerSnapshot(true))
        .catch(error => logger.captureException(error));
    }
  }, []);

  const resumeTimerByServicioId = useCallback((servicioId: string) => {
    const target = activeTimers.peek().find(t => t.servicioId === servicioId && !t.isTemporary);
    if (target) {
      // Reanudar solo con el vencimiento confirmado (incluye el tiempo pausado).
      void updateServiceStatus(servicioId, 2)
        .then(() => refreshTimerSnapshot(true))
        .catch(error => logger.captureException(error));
    }
  }, []);

  const startTemporaryTimer = useCallback(
    async (
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
      if (
        current.some(
          t =>
            t.isTemporary &&
            String(t.datosTemporales.peek()?.servicio_original_id ?? t.servicioId) ===
              String(servicioId)
        )
      )
        return;

      const normalizedServicioId = String(servicioId);
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

      await refreshTimerSnapshot(true)
        .then(() => {
          const temporary = activeTimers
            .peek()
            .find(
              t =>
                t.isTemporary &&
                String(t.datosTemporales.peek()?.servicio_original_id) === normalizedServicioId
            );
          // El manejador global conserva las notificaciones y la reanudacion del principal.
          if (temporary) {
            temporary.onExpire = () => onComplete();
            temporary.datosTemporales.value = {
              ...mergedDatosTemporales,
              ...temporary.datosTemporales.peek()
            };
          }
        })
        .catch(error => logger.captureException(error, { context: 'useTimerActions:temporary' }));
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
