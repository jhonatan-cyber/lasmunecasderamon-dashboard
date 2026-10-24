'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatNumberCL } from '@/lib/utils/formatters';
import { computeHostessLimit } from '@/components/orders/detail';
import { getOrderHostessIds } from '@/components/orders/orderDetailUtils';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { calcularPropina } from '@/lib/business/saleTotals';

interface UseOrderDetailModalStateParams {
  open: boolean;
  detail: any[];
  rooms: any[];
  onClose: () => void;
}

export function useOrderDetailModalState({ open, detail, rooms }: UseOrderDetailModalStateParams) {
  const [isRegistering, setIsRegistering] = useState(false);
  const metodoPagoGuardado = detail[0]?.metodo_pago || '';
  const propinaOriginal = Number(detail[0]?.propina || 0);
  const propinaPct = Number(useConfigValue('facturacion', 'propina_venta', '10'));
  const subtotalBase = useMemo(
    () => detail.reduce((sum, d) => sum + Number(d.precio || 0) * Number(d.cantidad || 0), 0),
    [detail]
  );

  // El cajero cobra con el método y la propina que elige al cobrar; el pedido
  // solo aporta los valores por defecto (paridad con el CheckoutModal de la app).
  const [metodoPago, setMetodoPago] = useState(metodoPagoGuardado);
  const [agregarPropina, setAgregarPropina] = useState(propinaOriginal > 0);
  // El prepago se ofrece solo si el cliente del pedido tiene saldo disponible.
  const clienteId = String(detail[0]?.cliente_id || '');
  const [clienteSaldo, setClienteSaldo] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !clienteId) {
      setClienteSaldo(null);
      return;
    }
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch(`/api/clients?id=${encodeURIComponent(clienteId)}`, {
          cache: 'no-store',
          signal: controller.signal
        });
        if (controller.signal.aborted) return;
        const data = await response.json();
        if (response.ok && data?.success) {
          setClienteSaldo(Number(data.data?.saldo ?? data.data?.saldo_prepago ?? 0));
        }
      } catch {
        // Sin saldo conocido el selector simplemente omite el prepago.
      }
    })();
    return () => controller.abort();
  }, [open, clienteId]);

  const [tiempoHabitacion, updateTiempoHabitacion] = useState(30);
  const tiempoEditado = useRef(false);
  const habitacionId = String(detail.find(d => d.habitacion_id)?.habitacion_id || '');
  const room = rooms.find(r => String(r.id_habitacion ?? r.id) === habitacionId);
  const tiempoInicial = Number(
    detail.find(d => d.habitacion_id)?.tiempo_habitacion || room?.tiempo || room?.time || 30
  );
  const setTiempoHabitacion = useCallback((minutes: number) => {
    tiempoEditado.current = true;
    updateTiempoHabitacion(minutes);
  }, []);
  // La propina que ya trae el pedido (la eligió el garzón) se conserva; sin ella,
  // el cajero la activa con el porcentaje configurado sobre los productos.
  const propina =
    propinaOriginal > 0
      ? propinaOriginal
      : calcularPropina(subtotalBase, propinaPct, agregarPropina);
  const propinaDisplayValue = propina ? formatNumberCL(propina) : '';
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

  // Al abrir o cambiar de pedido el pago vuelve al default del pedido; cambiar de
  // habitación no debe borrar lo que el cajero ya eligió.
  useEffect(() => {
    setMetodoPago(detail[0]?.metodo_pago || '');
    setAgregarPropina(Number(detail[0]?.propina || 0) > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, detail[0]?.id_pedido]);

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
      propinaOriginal,
      propinaPct,
      subtotalBase,
      clienteId,
      clienteSaldo,
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
      setAgregarPropina,
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
