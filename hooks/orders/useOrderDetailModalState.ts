'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatNumberCL } from '@/lib/utils/formatters';
import { computeHostessLimit } from '@/components/orders/detail';
import { getOrderHostessIds } from '@/components/orders/orderDetailUtils';

interface UseOrderDetailModalStateParams {
  open: boolean;
  detail: any[];
  rooms: any[];
  onClose: () => void;
}

export function useOrderDetailModalState({ open, detail, rooms }: UseOrderDetailModalStateParams) {
  const [isRegistering, setIsRegistering] = useState(false);
  const metodoPago = detail[0]?.metodo_pago || '';
  const propina = Number(detail[0]?.propina || 0);
  const habitacionId = String(detail.find(d => d.habitacion_id)?.habitacion_id || '');
  const [tiempoHabitacion, updateTiempoHabitacion] = useState(30);
  const tiempoEditado = useRef(false);
  const room = rooms.find(r => String(r.id_habitacion ?? r.id) === habitacionId);
  const tiempoInicial = Number(
    detail.find(d => d.habitacion_id)?.tiempo_habitacion || room?.tiempo || room?.time || 30
  );
  const setTiempoHabitacion = useCallback((minutes: number) => {
    tiempoEditado.current = true;
    updateTiempoHabitacion(minutes);
  }, []);
  const propinaDisplayValue = propina ? formatNumberCL(propina) : '';
  const agregarPropina = propina > 0;
  const [showMetodoPagoError, setShowMetodoPagoError] = useState(false);
  const [confirmVentaModalOpen, setConfirmVentaModalOpen] = useState(false);

  useEffect(() => {
    setIsRegistering(false);
    setShowMetodoPagoError(false);
    setConfirmVentaModalOpen(false);
    tiempoEditado.current = false;
    updateTiempoHabitacion(tiempoInicial);
    // Initialize on opening or switching order, without resetting a cashier's edited duration on refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, detail[0]?.id_pedido, habitacionId]);

  useEffect(() => {
    if (!tiempoEditado.current) updateTiempoHabitacion(tiempoInicial);
  }, [tiempoInicial]);

  useEffect(() => {
    if (metodoPago && showMetodoPagoError) {
      setShowMetodoPagoError(false);
    }
  }, [metodoPago, showMetodoPagoError]);

  const hostessLimits = useMemo(() => computeHostessLimit(detail), [detail]);
  const {
    maxAnfitrionas,
    champagneLimit,
    otherCommissionQuantity,
    hasChampagneProducts,
    maxChampagnePrice
  } = hostessLimits;

  const anfitrionasFinal = useMemo(() => getOrderHostessIds(detail), [detail]);

  const cantidadAnfitrionas = anfitrionasFinal.length;
  const recargoAnfitrionas = 0;

  const habitacionesActivas = useMemo(
    () =>
      rooms.filter((room: any) => {
        if ((room.status ?? room.estado) === 1) return true;
        if (habitacionId && String(room.id_habitacion ?? room.id ?? '') === String(habitacionId)) {
          return true;
        }
        return false;
      }),
    [habitacionId, rooms]
  );

  return {
    state: {
      isRegistering,
      metodoPago,
      propina,
      habitacionId,
      tiempoHabitacion,
      propinaDisplayValue,
      showMetodoPagoError,
      agregarPropina,
      confirmVentaModalOpen
    },
    setters: {
      setIsRegistering,
      setTiempoHabitacion,
      setShowMetodoPagoError,
      setConfirmVentaModalOpen
    },
    derived: {
      maxAnfitrionas,
      champagneLimit,
      otherCommissionQuantity,
      hasChampagneProducts,
      maxChampagnePrice,
      anfitrionasFinal,
      cantidadAnfitrionas,
      recargoAnfitrionas,
      habitacionesActivas
    }
  };
}
