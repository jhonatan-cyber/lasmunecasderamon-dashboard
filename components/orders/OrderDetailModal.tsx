/* eslint-disable */
'use client';

import { useEffect } from 'react';
import logger from '@/lib/utils/logger';
import { appEventBus } from '@/lib/utils/eventBus';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { generateRandomCode } from '@/lib/utils/codeUtils';
import { Separator } from '@/components/ui/separator';
import { useSales } from '@/hooks/caja/useSales';
import { toast } from 'sonner';
import { useTimer } from '@/contexts/TimerContext';
import { formatNumberCL } from '@/lib/utils/formatters';
import { useRefreshOnFocus } from '@/hooks/shared';
import { useAvailableRooms } from '@/hooks/habitaciones';
import { formatLongDateEs, formatShortTimeEs } from '@/lib/utils/calendarUtils';
import {
  OrderDetailInfoPanel,
  getOrderRoomId,
  getOrderRoomName,
  OrderDetailTotalsSummary,
  OrderDetailPaymentPanel
} from '@/components/orders/detail';
import { useOrderDetailModalState } from '@/hooks/orders/useOrderDetailModalState';

interface OrderDetailModalProps {
  open: boolean;
  onClose: () => void;
  detail: any[];
  isLoading: boolean;
  error: string | null;
  orderId?: string | null;
  orderCode?: string;
  onVentaRegistrada?: () => void;
  onOrderStatusChange?: () => void;
}

export default function OrderDetailModal({
  open,
  onClose,
  detail,
  isLoading,
  error,
  orderId,
  orderCode,
  onVentaRegistrada,
  onOrderStatusChange
}: OrderDetailModalProps) {
  const { rooms, refetchRooms } = useAvailableRooms();
  const { createVenta } = useSales();
  const { startTimer, getTimerByRoomId, formatTime } = useTimer();
  const {
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
  } = useOrderDetailModalState({ open, detail, rooms, onClose });

  useRefreshOnFocus(refetchRooms, { enabled: open });

  useEffect(() => {
    const handleCloseOrderModal = (detail: { orderId: number | string }) => {
      const { orderId: processedOrderId } = detail;
      if (open && orderId === processedOrderId) {
        onClose();
      }
    };

    const unsubscribe = appEventBus.on('closeOrderModal', handleCloseOrderModal);

    return () => {
      unsubscribe();
    };
  }, [open, orderId, onClose]);

  useEffect(() => {
    if (!open) {
      setMetodoPago('');
      setPropina(0);
      setHabitacionId('');
      setTiempoHabitacion(30);
      setPropinaDisplayValue('');
      setShowMetodoPagoError(false);
      setIsRegistering(false);
      setAgregarPropina(false);
      setConfirmVentaModalOpen(false);
    } else {
      if (detail && detail.length > 0) {
        const propinaOriginal = detail[0]?.propina || 0;

        if (propinaOriginal > 0) {
          setPropina(propinaOriginal);
          setPropinaDisplayValue(formatNumberCL(propinaOriginal));
          setAgregarPropina(true);
        }
        const detalleConHabitacion = detail.find(d => d.habitacion_id);
        if (detalleConHabitacion && detalleConHabitacion.habitacion_id) {
          const habitacionId = String(detalleConHabitacion.habitacion_id);
          setHabitacionId(habitacionId);
        } else {
          buscarHabitacionActiva();
        }
      }
    }
  }, [open, detail]);

  const buscarHabitacionActiva = async () => {
    if (!detail || detail.length === 0) {
      return;
    }

    try {
      const anfitrionasIds: number[] = [];

      const anfitrionaIdsStr = detail[0]?.anfitrionaIds;

      if (anfitrionaIdsStr) {
        const ids = anfitrionaIdsStr
          .split(',')
          .map((id: string) => parseInt(id.trim()))
          .filter((id: number) => !isNaN(id));
        anfitrionasIds.push(...ids);
      }

      detail.forEach(d => {
        if (d.hostess_id) {
          anfitrionasIds.push(d.hostess_id);
        }
        if (d.anfitrionas_asignadas_ids) {
          const ids = d.anfitrionas_asignadas_ids
            .split(',')
            .map((id: string) => parseInt(id.trim()))
            .filter((id: number) => !isNaN(id));
          anfitrionasIds.push(...ids);
        }
      });

      const anfitrionasUnicas = [...new Set(anfitrionasIds)];

      if (anfitrionasUnicas.length === 0) {
        return;
      }

      const response = await fetch('/api/orders/check-active-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ anfitrionasIds: anfitrionasUnicas })
      });

      const data = await response.json();

      if (data.success && data.hasActiveRoom && data.data) {
        const habitacionId = String(data.data.habitacionId);
        setHabitacionId(habitacionId);
        setTiempoHabitacion(data.data.tiempo || 30);
      }
    } catch (error) {
      logger.captureException(error, { context: 'OrderDetailModal:fetchDetail' });
    }
  };

  useEffect(() => {
    if (agregarPropina && detail && detail.length > 0) {
      const propinaOriginal = detail[0]?.propina || 0;
      if (propinaOriginal > 0) {
        setPropina(propinaOriginal);
        setPropinaDisplayValue(formatNumberCL(propinaOriginal));
      } else {
        const totalPedido = detail[0]?.total || 0;
        const propinaCalculada = Math.round(totalPedido * 0.1);
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
  }, [agregarPropina, detail]);

  useEffect(() => {
    if (metodoPago && showMetodoPagoError) {
      setShowMetodoPagoError(false);
    }
  }, [metodoPago, showMetodoPagoError]);

  const handleRegistrarVenta = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    setShowMetodoPagoError(true);

    if (!metodoPago) {
      toast.error('Selecciona un mÃ©todo de pago');
      return;
    }

    if (!detail || detail.length === 0) {
      toast.error('No hay detalles del pedido');
      return;
    }

    if (hasChampagneProducts && cantidadAnfitrionas === 0) {
      toast.error(
        'Para productos de champaÃ±a es obligatorio tener al menos una anfitriona en el pedido'
      );
      return;
    }

    if (cantidadAnfitrionas > maxAnfitrionas) {
      const extraText =
        hasChampagneProducts && otherCommissionQuantity > 0
          ? ` + ${otherCommissionQuantity} por ${otherCommissionQuantity === 1 ? 'trago' : 'tragos'} con comisiÃ³n`
          : '';
      toast.error(
        `El pedido excede el lÃ­mite combinado de ${maxAnfitrionas} anfitriona${maxAnfitrionas !== 1 ? 's' : ''} (champaÃ±a: ${champagneLimit}${extraText})`
      );
      return;
    }

    setConfirmVentaModalOpen(true);
  };

  const handleConfirmRegistrarVenta = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    setIsRegistering(true);
    try {
      const pedido = detail[0];

      const total_comision =
        detail.reduce((acc, item) => acc + (item.comision || 0), 0) + recargoAnfitrionas;

      const sub_total = detail.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

      const usuariosIds = anfitrionasFinal
        .map((anfitriona: any) => {
          if (typeof anfitriona === 'object' && anfitriona.usuario_id) {
            return anfitriona.usuario_id;
          }
          if (typeof anfitriona === 'object' && anfitriona.id) {
            return anfitriona.id;
          }
          if (typeof anfitriona === 'number') {
            return anfitriona;
          }
          if (typeof anfitriona === 'string') {
            const match = anfitriona.match(/^(\d+)\s*-\s*(.+)$/);
            if (match) {
              return parseInt(match[1]);
            }
            const parsedId = parseInt(anfitriona);
            if (!isNaN(parsedId)) {
              return parsedId;
            }
          }
          return null;
        })
        .filter((id): id is number => id !== null && !isNaN(id));

      if (usuariosIds.length === 0 && hasChampagneProducts) {
        toast.error('No se pudieron obtener los IDs de las anfitrionas');
        return;
      }

      const selectedRoom = habitacionId
        ? rooms.find(room => getOrderRoomId(room) === String(habitacionId))
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
          hostess_id: item.hostess_id || null
        })),
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

        await actualizarEstadoPedido(0);

        onOrderStatusChange?.();
        appEventBus.emit('updatePendingOrders', { type: 'order-processed', orderId: orderId });
        appEventBus.emit('refreshNotifications');

        if (habitacionId) {
          const selectedRoom = rooms.find(room => getOrderRoomId(room) === String(habitacionId));
          if (selectedRoom) {
            try {
              const roomUpdateResponse = await fetch(`/api/rooms/${habitacionId}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  action: 'occupy'
                })
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
                  detail[0]?.garzon || undefined
                );
              } else {
                toast.error('Error al actualizar estado de habitaciÃ³n');
              }
            } catch (error) {
              toast.error('Error al actualizar estado de habitaciÃ³n');
            }
          }
        }

        toast.success('Venta registrada exitosamente');
        appEventBus.emit('ventaRegistrada');
        onClose();
        onVentaRegistrada?.();
      }
    } catch (error) {
      toast.error('Error al registrar la venta');
    } finally {
      setIsRegistering(false);
      setConfirmVentaModalOpen(false);
    }
  };

  const handleCancelRegistrarVenta = () => {
    setConfirmVentaModalOpen(false);
  };

  const handleRechazarPedido = async () => {
    try {
      await actualizarEstadoPedido(2);
      appEventBus.emit('updatePendingOrders', { type: 'order-deleted', orderId: orderId });
      appEventBus.emit('refreshNotifications');
      toast.success('Pedido rechazado exitosamente');
      onClose();
      onVentaRegistrada?.();
    } catch (error) {
      toast.error('Error al rechazar el pedido');
    }
  };

  const handleRegistrarCuenta = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    setIsRegistering(true);
    try {
      const pedido = detail[0];

      const total_comision =
        detail.reduce((acc, item) => acc + (item.comision || 0), 0) + recargoAnfitrionas;
      const sub_total = detail.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

      const generateCode = generateRandomCode;

      const anfitrionasIds =
        detail[0]?.anfitrionas_con_ids?.map((anfitriona: any) => anfitriona.usuario_id) || [];

      const cuentaData = {
        codigo: generateCode(),
        cliente_id: pedido.cliente_id || null,
        total_comision: total_comision,
        sub_total: sub_total,
        total: sub_total + recargoAnfitrionas, 
        habitacion_id: shouldShowRoomSelector && habitacionId ? parseInt(habitacionId) : null,
        detalles: detail.map((item: any) => ({
          producto_id: item.id_producto || 1,
          precio: item.precio || 0,
          cantidad: item.cantidad || 0,
          comision: item.comision || 0,
          sub_total: (item.precio || 0) * (item.cantidad || 0)
        })),
        usuarios: anfitrionasIds
      };

      
      const response = await fetch('/api/cuentas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cuentaData)
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
          appEventBus.emit('updatePendingOrders', { type: 'order-processed', orderId: orderId });
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
  };

  const actualizarEstadoPedido = async (nuevoEstado: number) => {
    if (!orderId) {
      throw new Error('No hay ID de pedido');
    }

    const response = await fetch(`/api/orders/${orderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        estado: nuevoEstado
      })
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error('Error al actualizar el estado del pedido');
    }

    const result = await response.json();

    return result;
  };

  

  const hasChampagne = detail.some((item: any) => {
    const cat = (item.categoria || '').toLowerCase();
    return cat.includes('champaÃ±a') || cat.includes('shampaÃ±a') || cat.includes('champagne');
  });

  const hasExpensiveDrinks = detail.some((item: any) => {
    const precio = Number(item.precio || 0);
    return precio >= 30000;
  });

  const shouldShowRoomSelector = hasChampagne || hasExpensiveDrinks;
  const hasRoomSelectedInOrder = detail.some((item: any) => Boolean(item?.habitacion_id));

  const isClienteRegistrado = () => {
    const clienteId = detail[0]?.cliente_id;
    const cliente = String(detail[0]?.cliente || '');

    if (clienteId !== null && clienteId !== undefined && String(clienteId).trim() !== '') {
      return true;
    }

    return (
      cliente &&
      cliente.toLowerCase() !== 'cliente no registrado' &&
      cliente.toLowerCase() !== 'sin cliente' &&
      cliente.toLowerCase() !== 'sin cliente registrado' &&
      cliente.trim() !== '' &&
      cliente !== '-'
    );
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='flex max-h-[90vh] w-[95vw] max-w-[95vw] flex-col border border-border/60 bg-white p-0 sm:w-[56rem] sm:max-w-3xl dark:border-zinc-800 dark:bg-zinc-950'>
        <DialogHeader className='flex-shrink-0 border-b border-border/60 px-4 pb-4 pt-4 sm:px-6 sm:pt-6 dark:border-zinc-800'>
          <DialogTitle className='text-lg text-gray-900 dark:text-zinc-100 sm:text-xl'>
            Detalles del Pedido - {orderCode}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className='py-8 text-center text-gray-700 dark:text-zinc-300 sm:py-12'>
            <div className='text-sm sm:text-base'>Cargando detalles...</div>
          </div>
        ) : error ? (
          <div className='py-8 text-center text-gray-700 dark:text-zinc-300 sm:py-12'>
            <div className='text-red-500 text-sm sm:text-base'>{error}</div>
          </div>
        ) : detail && detail.length > 0 ? (
          <>
            {}
            <div className='flex-1 overflow-y-auto px-4 sm:px-6 py-4'>
              <div className='space-y-6'>
                {}
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                  <OrderDetailInfoPanel
                    createdAt={`${formatLongDateEs(detail[0]?.fecha_crea)} ${formatShortTimeEs(detail[0]?.fecha_crea)}`}
                    code={detail[0]?.codigo}
                    hostessName={detail[0]?.anfitriona}
                    clientName={detail[0]?.cliente}
                    garzonName={detail[0]?.garzon}
                    hasChampagneProducts={hasChampagneProducts}
                    cantidadAnfitrionas={cantidadAnfitrionas}
                    maxAnfitrionas={maxAnfitrionas}
                  />
                  {}
                  <OrderDetailPaymentPanel
                    metodoPago={metodoPago}
                    setMetodoPago={setMetodoPago}
                    showMetodoPagoError={showMetodoPagoError}
                    shouldShowRoomSelector={shouldShowRoomSelector}
                    habitacionesActivas={habitacionesActivas}
                    habitacionId={habitacionId}
                    setHabitacionId={setHabitacionId}
                    hasRoomSelectedInOrder={hasRoomSelectedInOrder}
                    tiempoHabitacion={tiempoHabitacion}
                    setTiempoHabitacion={setTiempoHabitacion}
                    propinaDisplayValue={propinaDisplayValue}
                    agregarPropina={agregarPropina}
                    setAgregarPropina={setAgregarPropina}
                    propina={propina}
                    orderTotalCommission={detail[0]?.total_comision || 0}
                  />
                </div>

                {}
                <div className='bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-2xl border-none shadow-md overflow-hidden'>
                  <Table>
                    <TableHeader className='bg-gray-100 dark:bg-slate-900/50'>
                      <TableRow className='hover:bg-transparent border-gray-100 dark:border-gray-800'>
                        <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-left'>
                          Bebida
                        </TableHead>
                        <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>
                          Cantidad
                        </TableHead>
                        <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>
                          Precio
                        </TableHead>
                        <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>
                          ComisiÃ³n
                        </TableHead>
                        <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-right'>
                          Sub Total
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.map((item: any, idx: number) => (
                        <TableRow
                          key={idx}
                          className={`border-b transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/30 ${idx === 0 ? 'first:rounded-t-xl' : ''} ${idx === detail.length - 1 ? 'last:rounded-b-xl' : ''}`}
                        >
                          <TableCell className='py-3 px-4 text-left font-medium'>
                            {item.producto_nombre}
                          </TableCell>
                          <TableCell className='py-3 px-4 text-center'>{item.cantidad}</TableCell>
                          <TableCell className='py-3 px-4 text-center'>
                            {formatCurrencyCLP(item.precio)}
                          </TableCell>
                          <TableCell className='py-3 px-4 text-center'>
                            {formatCurrencyCLP(item.comision)}
                          </TableCell>
                          <TableCell className='py-3 px-4 text-right font-medium'>
                            {formatCurrencyCLP(item.subtotal)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <Separator className='my-4' />

                  <OrderDetailTotalsSummary
                    subtotal={detail[0]?.total || 0}
                    propina={propina}
                    recargoAnfitrionas={recargoAnfitrionas}
                    total={(detail[0]?.total || 0) + propina + recargoAnfitrionas}
                  />
                </div>
              </div>
            </div>
            {}
            <div className='flex-shrink-0 border-t border-border/60 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950 sm:px-6'>
              <div className='flex flex-col sm:flex-row justify-center gap-2 sm:gap-4'>
                <Button
                  size='sm'
                  variant='outline'
                  className='w-full rounded-full bg-black px-4 text-xs text-white transition-all duration-200 hover:scale-105 sm:w-auto sm:px-6 sm:text-sm dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white'
                  onClick={handleRegistrarVenta}
                  disabled={isRegistering}
                  type='button'
                >
                  {isRegistering ? 'Registrando...' : 'Registrar Venta'}
                </Button>
                {isClienteRegistrado() && (
                  <Button
                    size='sm'
                    variant='outline'
                    className='w-full rounded-full bg-black px-4 text-xs text-white transition-all duration-200 hover:scale-105 sm:w-auto sm:px-6 sm:text-sm dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white'
                    onClick={handleRegistrarCuenta}
                    disabled={isRegistering}
                    type='button'
                  >
                    {isRegistering ? 'Registrando...' : 'Registrar Cuenta'}
                  </Button>
                )}

                <Button
                  size='sm'
                  variant='outline'
                  className='w-full rounded-full bg-gray-500 px-4 text-xs text-white transition-all duration-200 hover:scale-105 hover:bg-gray-600 sm:w-auto sm:px-6 sm:text-sm dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700'
                  onClick={e => {
                    e.preventDefault();
                    onClose();
                  }}
                  type='button'
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className='py-8 text-center text-gray-700 dark:text-zinc-300 sm:py-12'>
            <div className='text-sm text-gray-500 dark:text-zinc-400 sm:text-base'>
              No hay detalles disponibles
            </div>
          </div>
        )}
      </DialogContent>

      {}
      <Dialog open={confirmVentaModalOpen} onOpenChange={setConfirmVentaModalOpen}>
        <DialogContent className='sm:max-w-md border border-border/60 bg-white dark:border-zinc-800 dark:bg-zinc-950'>
          <DialogHeader>
            <DialogTitle className='text-gray-900 dark:text-zinc-100'>
              Confirmar registro de venta
            </DialogTitle>
            <DialogDescription className='text-gray-600 dark:text-zinc-400'>
              ??Est??s seguro de que deseas registrar esta venta?
            </DialogDescription>
          </DialogHeader>
          <div className='px-6 py-4 text-gray-800 dark:text-zinc-200'>
            <div className='space-y-2 text-sm'>
              <div>
                <strong>Pedido:</strong> {orderCode}
              </div>
              <div>
                <strong>Total:</strong>{' '}
                {formatCurrencyCLP((detail[0]?.total || 0) + propina + recargoAnfitrionas)}
              </div>
              <div>
                <strong>Método de pago:</strong> {metodoPago}
              </div>
              {propina > 0 && (
                <div>
                  <strong>Propina:</strong> {formatCurrencyCLP(propina)}
                </div>
              )}
              {shouldShowRoomSelector && habitacionId && (
                <>
                  <div>
                    <strong>Habitación:</strong>{' '}
                    {rooms.find(r => r.id === parseInt(habitacionId))?.name || habitacionId}
                  </div>
                  <div>
                    <strong>Tiempo:</strong> {tiempoHabitacion} minutos
                  </div>
                </>
              )}
            </div>
          </div>
          <DialogFooter className='flex justify-center items-center gap-3 sm:justify-center'>
            <Button
              variant='outline'
              onClick={e => {
                e.preventDefault();
                handleCancelRegistrarVenta();
              }}
              disabled={isRegistering}
              className='rounded-full dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800'
              type='button'
            >
              Cancelar
            </Button>
            <Button
              variant='outline'
              onClick={handleConfirmRegistrarVenta}
              disabled={isRegistering}
              className='rounded-full bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-400'
              type='button'
            >
              {isRegistering ? (
                <>
                  <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2' />
                  Registrando...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
