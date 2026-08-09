'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatNumberCL } from '@/lib/utils/formatters';
import { computeHostessLimit, extractHostessIds } from '@/components/orders/detail';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { calcularPropina } from '@/lib/business/saleTotals';
import logger from '@/lib/utils/logger';

interface UseOrderDetailModalStateParams {
  open: boolean;
  detail: any[];
  rooms: any[];
  onClose: () => void;
}

export function useOrderDetailModalState({
  open,
  detail,
  rooms,
  onClose
}: UseOrderDetailModalStateParams) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [metodoPago, setMetodoPago] = useState('');
  const [propina, setPropina] = useState(0);
  const [habitacionId, setHabitacionId] = useState('');
  const [tiempoHabitacion, setTiempoHabitacion] = useState(30);
  const [propinaDisplayValue, setPropinaDisplayValue] = useState('');
  const [showMetodoPagoError, setShowMetodoPagoError] = useState(false);
  const [agregarPropina, setAgregarPropina] = useState(false);
  const propinaPct = Number(useConfigValue('facturacion', 'propina_venta', '10'));
  const [confirmVentaModalOpen, setConfirmVentaModalOpen] = useState(false);

  const resetState = () => {
    setMetodoPago('');
    setPropina(0);
    setHabitacionId('');
    setTiempoHabitacion(30);
    setPropinaDisplayValue('');
    setShowMetodoPagoError(false);
    setIsRegistering(false);
    setAgregarPropina(false);
    setConfirmVentaModalOpen(false);
  };

  const buscarHabitacionActiva = async () => {
    if (!detail || detail.length === 0) return;

    try {
      const anfitrionasIds = Array.from(
        new Set(
          detail.flatMap(d => [
            ...extractHostessIds(d.anfitrionaIds),
            ...extractHostessIds(d.hostess_id),
            ...extractHostessIds(d.anfitrionas_asignadas_ids)
          ])
        )
      );

      if (anfitrionasIds.length === 0) return;

      const response = await fetch('/api/orders/check-active-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ anfitrionasIds })
      });

      const data = await response.json();

      if (data.success && data.hasActiveRoom && data.data) {
        setHabitacionId(String(data.data.habitacionId));
        setTiempoHabitacion(data.data.tiempo || 30);
      }
    } catch (error) {
      logger.captureException(error, { context: 'OrderDetailModal:fetchDetail' });
    }
  };

  useEffect(() => {
    if (!open) {
      resetState();
      return;
    }

    if (detail && detail.length > 0) {
      const propinaOriginal = detail[0]?.propina || 0;

      if (propinaOriginal > 0) {
        setPropina(propinaOriginal);
        setPropinaDisplayValue(formatNumberCL(propinaOriginal));
        setAgregarPropina(true);
      }

      const detalleConHabitacion = detail.find(d => d.habitacion_id);
      if (detalleConHabitacion && detalleConHabitacion.habitacion_id) {
        setHabitacionId(String(detalleConHabitacion.habitacion_id));
      } else {
        void buscarHabitacionActiva();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, detail]);

  useEffect(() => {
    if (agregarPropina && detail && detail.length > 0) {
      const propinaOriginal = detail[0]?.propina || 0;
      if (propinaOriginal > 0) {
        setPropina(propinaOriginal);
        setPropinaDisplayValue(formatNumberCL(propinaOriginal));
      } else {
        const totalPedido = detail[0]?.total || 0;
        const propinaCalculada = calcularPropina(totalPedido, propinaPct, true);
        setPropina(propinaCalculada);
        setPropinaDisplayValue(formatNumberCL(propinaCalculada));
      }
    } else {
      const propinaOriginal = detail[0]?.propina || 0;
      if (propinaOriginal === 0) {
        setPropina(0);
        setPropinaDisplayValue('');
      }
    }
  }, [agregarPropina, detail, propinaPct]);

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

  const anfitrionasFinal = useMemo(() => {
    const raw =
      detail[0]?.anfitrionas_con_ids ||
      detail[0]?.anfitrionas ||
      detail[0]?.anfitriona ||
      detail[0]?.usuarios ||
      detail[0]?.hostesses ||
      [];

    const array = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return array
      .map((anfitriona: any) => {
        if (typeof anfitriona === 'object' && anfitriona !== null) {
          return anfitriona.id_usuario ?? anfitriona.id ?? anfitriona.usuario_id ?? null;
        }
        if (typeof anfitriona === 'number') return anfitriona;
        if (typeof anfitriona === 'string') {
          const match = anfitriona.match(/^(\d+)\s*-\s*(.+)$/);
          if (match) return parseInt(match[1]);
          const parsed = parseInt(anfitriona);
          return Number.isNaN(parsed) ? null : parsed;
        }
        return null;
      })
      .filter((id: number | null): id is number => id !== null && !Number.isNaN(id));
  }, [detail]);

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
      setMetodoPago,
      setPropina,
      setHabitacionId,
      setTiempoHabitacion,
      setPropinaDisplayValue,
      setShowMetodoPagoError,
      setAgregarPropina,
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
