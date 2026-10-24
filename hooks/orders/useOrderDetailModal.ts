'use client';

import { useSingleFlight } from '@/hooks/shared/useSingleFlight';
import { orderLineToSaleDetail } from '@/lib/sales/orderSale';
import { useEffect, useCallback, useRef } from 'react';
import logger from '@/lib/utils/logger';
import { appEventBus } from '@/lib/utils/eventBus';
import { toast } from 'sonner';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { generateRandomCode } from '@/lib/utils/codeUtils';
import { getOrderRoomId, getOrderRoomName } from '@/components/orders/detail';
import { extractHostessIds } from '@/components/orders/orderDetailUtils';
import { isChampagneProduct, isExpensiveDrink } from '@/components/orders/productModalRules';

interface OrderDetailModalState {
  isRegistering: boolean;
  metodoPago: string;
  propina: number;
  clienteSaldo: number | null;
  habitacionId: string;
  tiempoHabitacion: number;
  showMetodoPagoError: boolean;
  confirmVentaModalOpen: boolean;
}

interface OrderDetailModalSetters {
  setIsRegistering: (v: boolean) => void;
  setMetodoPago: (v: string) => void;
  setAgregarPropina: (v: boolean) => void;
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
  state: { isRegistering, metodoPago, propina, clienteSaldo, tiempoHabitacion },
  setters: { setIsRegistering, setShowMetodoPagoError, setConfirmVentaModalOpen },
  derived: { anfitrionasFinal, recargoAnfitrionas }
}: UseOrderDetailModalParams) {
  const registeringSale = useRef(false);
  const accountIntent = useRef<{ signature: string; code: string; confirmed: boolean } | undefined>(
    undefined
  );
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

  const hasChampagne = detail.some((item: any) => isChampagneProduct(item));
  const hasExpensiveDrinks = detail.some((item: any) => isExpensiveDrink(item));
  const habitacionId = String(detail.find(item => item?.habitacion_id)?.habitacion_id || '');
  const shouldShowRoomSelector = Boolean(habitacionId);
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
  const actualizarEstadoPedido = useCallback(
    async (nuevoEstado: number) => {
      if (!orderId) {
        throw new Error('No hay ID de pedido');
      }

      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado })
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el estado del pedido');
      }

      return response.json();
    },
    [orderId]
  );

  const handleRegistrarVenta = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault();
      setShowMetodoPagoError(true);

      // El pago lo elige el cajero al cobrar; el pedido puede venir sin método.
      if (!metodoPago) {
        toast.error('Selecciona el método de pago con el que cobra el pedido');
        return;
      }

      // Un prepago sin saldo descontaría nada y dejaría la venta sin pagar.
      if (metodoPago === 'prepago' && !(Number(clienteSaldo || 0) > 0)) {
        toast.error('El cliente del pedido no tiene saldo prepago disponible');
        return;
      }

      if (!detail || detail.length === 0) {
        toast.error('No hay detalles del pedido');
        return;
      }

      if (
        habitacionId &&
        (!Number.isInteger(tiempoHabitacion) || tiempoHabitacion < 1 || tiempoHabitacion > 1440)
      ) {
        toast.error('Indica un tiempo de uso entre 1 y 1440 minutos');
        return;
      }

      setConfirmVentaModalOpen(true);
    },
    [
      metodoPago,
      clienteSaldo,
      detail,
      habitacionId,
      tiempoHabitacion,
      setShowMetodoPagoError,
      setConfirmVentaModalOpen
    ]
  );

  const handleConfirmRegistrarVenta = useCallback(
    async (e?: React.MouseEvent) => {
      e?.preventDefault();
      if (registeringSale.current) return;
      registeringSale.current = true;
      setIsRegistering(true);
      try {
        const pedido = detail[0];
        if (!pedido || !orderId || !metodoPago) throw new Error('Pedido incompleto');
        if (metodoPago === 'prepago' && !(Number(clienteSaldo || 0) > 0))
          throw new Error('Sin saldo prepago disponible');
        if (
          habitacionId &&
          (!Number.isInteger(tiempoHabitacion) || tiempoHabitacion < 1 || tiempoHabitacion > 1440)
        )
          throw new Error('Tiempo invalido');

        const sub_total = detail.reduce(
          (acc: number, item: any) => acc + item.precio * item.cantidad,
          0
        );

        const usuariosIds = extractHostessIds(anfitrionasFinal);

        const ventaData = {
          cliente_id: pedido.cliente_id || null,
          pedido_id: orderId || null,
          metodo_pago: metodoPago as 'efectivo' | 'tarjeta' | 'transferencia' | 'prepago',
          propina: propina,
          sub_total: sub_total,
          total: sub_total + propina,
          detalles: detail.map(orderLineToSaleDetail),
          usuarios: usuariosIds,
          habitacion_id: shouldShowRoomSelector && habitacionId ? habitacionId : undefined,
          tiempo: shouldShowRoomSelector && habitacionId ? tiempoHabitacion : 0
        };

        const resultado = await createVenta(ventaData);
        if (resultado && resultado.success) {
          if (propina > 0) {
            toast.success(
              `Venta registrada con propina de ${formatCurrencyCLP(propina)} distribuida entre los cajeros y garzones`
            );
          }

          onOrderStatusChange?.();
          appEventBus.emit('updatePendingOrders', { type: 'order-processed', orderId });
          appEventBus.emit('refreshNotifications');

          if (habitacionId) {
            const selectedRoom = rooms.find(
              (room: any) => getOrderRoomId(room) === String(habitacionId)
            );
            if (selectedRoom) {
              startTimer(
                resultado.data?.id || resultado.data?.id_venta || orderId,
                String(selectedRoom.id ?? selectedRoom.id_habitacion ?? ''),
                getOrderRoomName(selectedRoom),
                tiempoHabitacion,
                resultado.data?.codigo || `VENTA_${orderId}`,
                detail[0]?.cliente || 'cliente sin registrar',
                detail[0]?.anfitriona || '',
                'venta',
                detail[0]?.garzon || undefined
              );
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
        registeringSale.current = false;
        setIsRegistering(false);
        setConfirmVentaModalOpen(false);
      }
    },
    [
      detail,
      anfitrionasFinal,
      habitacionId,
      rooms,
      metodoPago,
      propina,
      clienteSaldo,
      shouldShowRoomSelector,
      tiempoHabitacion,
      orderId,
      createVenta,
      startTimer,
      onOrderStatusChange,
      onClose,
      onVentaRegistrada,
      setIsRegistering,
      setConfirmVentaModalOpen
    ]
  );

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

  const handleRegistrarCuenta = useCallback(
    async (e?: React.MouseEvent) => {
      e?.preventDefault();
      setIsRegistering(true);
      try {
        const pedido = detail[0];
        const total_comision =
          detail.reduce((acc: number, item: any) => acc + (item.comision || 0), 0) +
          recargoAnfitrionas;
        const sub_total = detail.reduce(
          (acc: number, item: any) => acc + item.precio * item.cantidad,
          0
        );

        const anfitrionasIds = extractHostessIds(anfitrionasFinal);

        const cuentaData = {
          codigo: '',
          cliente_id: pedido.cliente_id || null,
          total_comision,
          sub_total,
          total: sub_total + recargoAnfitrionas,
          habitacion_id: shouldShowRoomSelector && habitacionId ? String(habitacionId) : null,
          detalles: detail.map(orderLineToSaleDetail),
          usuarios: anfitrionasIds
        };

        const signature = JSON.stringify({ orderId, cuentaData });
        if (accountIntent.current?.signature !== signature) {
          accountIntent.current = { signature, code: generateRandomCode(), confirmed: false };
        }
        const currentIntent = accountIntent.current;
        if (currentIntent.confirmed) return;
        cuentaData.codigo = currentIntent.code;
        const response = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cuentaData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error al crear la cuenta');
        }

        const result = await response.json();

        if (result.success) {
          currentIntent.confirmed = true;
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
    },
    [
      detail,
      anfitrionasFinal,
      recargoAnfitrionas,
      shouldShowRoomSelector,
      habitacionId,
      orderId,
      actualizarEstadoPedido,
      onClose,
      onVentaRegistrada,
      onOrderStatusChange,
      setIsRegistering
    ]
  );

  const registerAccount = useSingleFlight(handleRegistrarCuenta);

  return {
    handleRegistrarVenta,
    handleConfirmRegistrarVenta,
    handleCancelRegistrarVenta,
    handleRechazarPedido,
    handleRegistrarCuenta: registerAccount,
    actualizarEstadoPedido,
    hasChampagne,
    hasExpensiveDrinks,
    shouldShowRoomSelector,
    hasRoomSelectedInOrder,
    isClienteRegistrado,
    isRegistering
  };
}
