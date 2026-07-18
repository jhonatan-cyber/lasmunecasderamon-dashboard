'use client';

import { useEffect, useCallback } from 'react';
import logger from '@/lib/utils/logger';
import { appEventBus } from '@/lib/utils/eventBus';
import { toast } from 'sonner';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { generateRandomCode } from '@/lib/utils/codeUtils';
import { getOrderRoomId, getOrderRoomName } from '@/components/orders/detail';
import { isChampagneProduct, isExpensiveDrink } from '@/components/orders/productModalRules';

interface OrderDetailModalState {
  isRegistering: boolean;
  metodoPago: string;
  propina: number;
  habitacionId: string;
  tiempoHabitacion: number;
  showMetodoPagoError: boolean;
  confirmVentaModalOpen: boolean;
}

interface OrderDetailModalSetters {
  setIsRegistering: (v: boolean) => void;
  setMetodoPago: (v: string) => void;
  setPropina: (v: number) => void;
  setHabitacionId: (v: string) => void;
  setTiempoHabitacion: (v: number) => void;
  setShowMetodoPagoError: (v: boolean) => void;
  setConfirmVentaModalOpen: (v: boolean) => void;
}

interface OrderDetailModalDerived {
  hasChampagneProducts: boolean;
  cantidadAnfitrionas: number;
  maxAnfitrionas: number;
  otherCommissionQuantity: number;
  champagneLimit: number;
  recargoAnfitrionas: number;
  anfitrionasFinal: any[];
  habitacionesActivas: any[];
}

interface UseOrderDetailModalParams {
  open: boolean;
  onClose: () => void;
  detail: any[];
  orderId?: string | null;
  orderCode?: string;
  onVentaRegistrada?: () => void;
  onOrderStatusChange?: () => void;
  rooms: any[];
  createVenta: any;
  startTimer: any;
  state: OrderDetailModalState;
  setters: OrderDetailModalSetters;
  derived: OrderDetailModalDerived;
}

export function useOrderDetailModal({
  open,
  onClose,
  detail,
  orderId,
  orderCode,
  onVentaRegistrada,
  onOrderStatusChange,
  rooms,
  createVenta,
  startTimer,
  state: {
    isRegistering,
    metodoPago,
    propina,
    habitacionId,
    tiempoHabitacion,
    showMetodoPagoError,
  },
  setters: {
    setIsRegistering,
    setMetodoPago,
    setPropina,
    setHabitacionId,
    setTiempoHabitacion,
    setShowMetodoPagoError,
    setConfirmVentaModalOpen,
  },
  derived: {
    hasChampagneProducts,
    cantidadAnfitrionas,
    maxAnfitrionas,
    otherCommissionQuantity,
    champagneLimit,
    recargoAnfitrionas,
    anfitrionasFinal,
    habitacionesActivas,
  },
}: UseOrderDetailModalParams) {
  // --- Event listeners ---
  useEffect(() => {
    const handleCloseOrderModal = (eventDetail: { orderId: number | string }) => {
      const { orderId: processedOrderId } = eventDetail;
      if (open && orderId === processedOrderId) {
        onClose();
      }
    };

    const unsubscribe = appEventBus.on('closeOrderModal', handleCloseOrderModal);
    return () => unsubscribe();
  }, [open, orderId, onClose]);

  // --- Derived values ---
  const hasChampagne = detail.some((item: any) => isChampagneProduct(item));
  const hasExpensiveDrinks = detail.some((item: any) => isExpensiveDrink(item));
  const shouldShowRoomSelector = hasChampagne || hasExpensiveDrinks;
  const hasRoomSelectedInOrder = detail.some((item: any) => Boolean(item?.habitacion_id));

  const isClienteRegistrado = useCallback(() => {
    const clienteId = detail[0]?.cliente_id;
    const cliente = String(detail[0]?.cliente || '');

    if (clienteId !== null && clienteId !== undefined && String(clienteId).trim() !== '') {
      return true;
    }

    return !!(
      cliente &&
      cliente.toLowerCase() !== 'cliente no registrado' &&
      cliente.toLowerCase() !== 'sin cliente' &&
      cliente.toLowerCase() !== 'sin cliente registrado' &&
      cliente.trim() !== '' &&
      cliente !== '-'
    );
  }, [detail]);

  // --- Handlers ---
  const actualizarEstadoPedido = useCallback(async (nuevoEstado: number) => {
    if (!orderId) {
      throw new Error('No hay ID de pedido');
    }

    const response = await fetch(`/api/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado }),
    });

    if (!response.ok) {
      throw new Error('Error al actualizar el estado del pedido');
    }

    return response.json();
  }, [orderId]);

  const handleRegistrarVenta = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    setShowMetodoPagoError(true);

    if (!metodoPago) {
      toast.error('Selecciona un método de pago');
      return;
    }

    if (!detail || detail.length === 0) {
      toast.error('No hay detalles del pedido');
      return;
    }

    if (hasChampagneProducts && cantidadAnfitrionas === 0) {
      toast.error('Para productos de champaña es obligatorio tener al menos una anfitriona en el pedido');
      return;
    }

    if (cantidadAnfitrionas > maxAnfitrionas) {
      const extraText =
        hasChampagneProducts && otherCommissionQuantity > 0
          ? ` + ${otherCommissionQuantity} por ${otherCommissionQuantity === 1 ? 'trago' : 'tragos'} con comisión`
          : '';
      toast.error(
        `El pedido excede el límite combinado de ${maxAnfitrionas} anfitriona${maxAnfitrionas !== 1 ? 's' : ''} (champaña: ${champagneLimit}${extraText})`
      );
      return;
    }

    setConfirmVentaModalOpen(true);
  }, [
    metodoPago, detail, hasChampagneProducts, cantidadAnfitrionas,
    maxAnfitrionas, otherCommissionQuantity, champagneLimit,
    setShowMetodoPagoError, setConfirmVentaModalOpen,
  ]);

  const handleConfirmRegistrarVenta = useCallback(async (e?: React.MouseEvent) => {
    e?.preventDefault();
    setIsRegistering(true);
    try {
      const pedido = detail[0];

      const sub_total = detail.reduce((acc: number, item: any) => acc + item.precio * item.cantidad, 0);

      const usuariosIds = anfitrionasFinal
        .map((anfitriona: any) => {
          if (typeof anfitriona === 'object' && anfitriona.usuario_id) return anfitriona.usuario_id;
          if (typeof anfitriona === 'object' && anfitriona.id) return anfitriona.id;
          if (typeof anfitriona === 'number') return anfitriona;
          if (typeof anfitriona === 'string') {
            const match = anfitriona.match(/^(\d+)\s*-\s*(.+)$/);
            if (match) return parseInt(match[1]);
            const parsedId = parseInt(anfitriona);
            if (!isNaN(parsedId)) return parsedId;
          }
          return null;
        })
        .filter((id: number | null): id is number => id !== null && !isNaN(id));

      if (usuariosIds.length === 0 && hasChampagneProducts) {
        toast.error('No se pudieron obtener los IDs de las anfitrionas');
        return;
      }

      const selectedRoom = habitacionId
        ? rooms.find((room: any) => getOrderRoomId(room) === String(habitacionId))
        : null;

      const ventaData = {
        cliente_id: pedido.cliente_id || null,
        pedido_id: orderId || null,
        metodo_pago: metodoPago as 'efectivo' | 'tarjeta' | 'transferencia',
        propina: propina,
        sub_total: sub_total,
        total: sub_total + propina + recargoAnfitrionas,
        detalles: detail.map((item: any) => ({
          producto_id: item.id_producto || item.producto_id,
          precio: item.precio || 0,
          cantidad: item.cantidad || 0,
          comision: item.comision || 0,
          sub_total: (item.precio || 0) * (item.cantidad || 0),
          hostess_id: item.hostess_id || null,
        })),
        usuarios: usuariosIds,
        habitacion_id: shouldShowRoomSelector && habitacionId ? habitacionId : undefined,
        tiempo: shouldShowRoomSelector && habitacionId ? tiempoHabitacion : 0,
      };

      const resultado = await createVenta(ventaData);
      if (resultado && resultado.success) {
        if (propina > 0) {
          toast.success(`Venta registrada con propina de ${formatCurrencyCLP(propina)} distribuida entre los cajeros y garzones`);
        }

        await actualizarEstadoPedido(0);

        onOrderStatusChange?.();
        appEventBus.emit('updatePendingOrders', { type: 'order-processed', orderId });
        appEventBus.emit('refreshNotifications');

        if (habitacionId) {
          const selectedRoom = rooms.find((room: any) => getOrderRoomId(room) === String(habitacionId));
          if (selectedRoom) {
            try {
              const roomUpdateResponse = await fetch(`/api/rooms/${habitacionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'occupy' }),
              });

              if (roomUpdateResponse.ok) {
                startTimer(
                  resultado.data?.id || resultado.data?.id_venta || orderId || 0,
                  String(selectedRoom.id ?? selectedRoom.id_habitacion ?? ''),
                  getOrderRoomName(selectedRoom),
                  tiempoHabitacion,
                  resultado.data?.codigo || `VENTA_${orderId}`,
                  detail[0]?.cliente || 'cliente sin registrar',
                  detail[0]?.anfitriona || '',
                  'venta',
                  detail[0]?.garzon || undefined,
                );
              } else {
                toast.error('Error al actualizar estado de habitación');
              }
            } catch {
              toast.error('Error al actualizar estado de habitación');
            }
          }
        }

        toast.success('Venta registrada exitosamente');
        appEventBus.emit('ventaRegistrada');
        onClose();
        onVentaRegistrada?.();
      }
    } catch {
      toast.error('Error al registrar la venta');
    } finally {
      setIsRegistering(false);
      setConfirmVentaModalOpen(false);
    }
  }, [
    detail, anfitrionasFinal, hasChampagneProducts, habitacionId, rooms,
    metodoPago, propina, recargoAnfitrionas, shouldShowRoomSelector,
    tiempoHabitacion, orderId, createVenta, startTimer,
    actualizarEstadoPedido, onOrderStatusChange, onClose, onVentaRegistrada,
    setIsRegistering, setConfirmVentaModalOpen,
  ]);

  const handleCancelRegistrarVenta = useCallback(() => {
    setConfirmVentaModalOpen(false);
  }, [setConfirmVentaModalOpen]);

  const handleRechazarPedido = useCallback(async () => {
    try {
      await actualizarEstadoPedido(2);
      appEventBus.emit('updatePendingOrders', { type: 'order-deleted', orderId });
      appEventBus.emit('refreshNotifications');
      toast.success('Pedido rechazado exitosamente');
      onClose();
      onVentaRegistrada?.();
    } catch {
      toast.error('Error al rechazar el pedido');
    }
  }, [actualizarEstadoPedido, orderId, onClose, onVentaRegistrada]);

  const handleRegistrarCuenta = useCallback(async (e?: React.MouseEvent) => {
    e?.preventDefault();
    setIsRegistering(true);
    try {
      const pedido = detail[0];
      const total_comision = detail.reduce((acc: number, item: any) => acc + (item.comision || 0), 0) + recargoAnfitrionas;
      const sub_total = detail.reduce((acc: number, item: any) => acc + item.precio * item.cantidad, 0);

      const anfitrionasIds = detail[0]?.anfitrionas_con_ids?.map((a: any) => a.usuario_id) || [];

      const cuentaData = {
        codigo: generateRandomCode(),
        cliente_id: pedido.cliente_id || null,
        total_comision,
        sub_total,
        total: sub_total + recargoAnfitrionas,
        habitacion_id: shouldShowRoomSelector && habitacionId ? parseInt(habitacionId) : null,
        detalles: detail.map((item: any) => ({
          producto_id: item.id_producto || 1,
          precio: item.precio || 0,
          cantidad: item.cantidad || 0,
          comision: item.comision || 0,
          sub_total: (item.precio || 0) * (item.cantidad || 0),
        })),
        usuarios: anfitrionasIds,
      };

      const response = await fetch('/api/cuentas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuentaData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear la cuenta');
      }

      const result = await response.json();

      if (result.success) {
        toast.success('Cuenta registrada exitosamente');

        try {
          await actualizarEstadoPedido(0);
          appEventBus.emit('updatePendingOrders', { type: 'order-processed', orderId });
          appEventBus.emit('refreshNotifications');
        } catch (estadoError) {
          logger.captureException(estadoError, { context: 'OrderDetailModal:fetchDetail' });
        }

        onClose();
        onVentaRegistrada?.();
        onOrderStatusChange?.();
      } else {
        throw new Error(result.message || 'Error al crear la cuenta');
      }
    } catch (error) {
      toast.error('Error al registrar la cuenta');
    } finally {
      setIsRegistering(false);
    }
  }, [
    detail, recargoAnfitrionas, shouldShowRoomSelector, habitacionId,
    orderId, actualizarEstadoPedido, onClose, onVentaRegistrada, onOrderStatusChange,
    setIsRegistering,
  ]);

  return {
    handleRegistrarVenta,
    handleConfirmRegistrarVenta,
    handleCancelRegistrarVenta,
    handleRechazarPedido,
    handleRegistrarCuenta,
    actualizarEstadoPedido,
    hasChampagne,
    hasExpensiveDrinks,
    shouldShowRoomSelector,
    hasRoomSelectedInOrder,
    isClienteRegistrado,
    isRegistering,
  };
}
