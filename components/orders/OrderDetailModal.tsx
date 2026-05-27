/* eslint-disable */
'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Coins, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { Checkbox } from '@/components/ui/checkbox';
import PaymentMethodSelect from '@/components/shared/selects/PaymentMethodSelect';
import RoomSelect from '@/components/shared/selects/RoomSelect';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useSales } from '@/hooks/caja/useSales';
import { toast } from 'sonner';
import { useTimer } from '@/contexts/TimerContext';
import { formatNumberCL } from '@/lib/utils/formatters';
import { formatLongDateEs, formatShortTimeEs } from '@/lib/utils/calendarUtils';
import {
  ORDER_FIELD_INPUT_CLASS,
  ORDER_FIELD_INPUT_WITH_ICON_CLASS,
  ORDER_FIELD_LABEL_CLASS,
  ORDER_FIELD_POPOVER_CLASS,
  ORDER_FIELD_TRIGGER_CLASS
} from '@/components/orders/orderFieldStyles';

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
  const [rooms, setRooms] = useState<any[]>([]);
  const { createVenta } = useSales();
  const { startTimer, getTimerByRoomId, formatTime } = useTimer();
  const [isRegistering, setIsRegistering] = useState(false);
  const [metodoPago, setMetodoPago] = useState('');
  const [propina, setPropina] = useState(0);
  const [habitacionId, setHabitacionId] = useState('');
  const [tiempoHabitacion, setTiempoHabitacion] = useState(30);
  const [propinaDisplayValue, setPropinaDisplayValue] = useState('');
  const [showMetodoPagoError, setShowMetodoPagoError] = useState(false);
  const [agregarPropina, setAgregarPropina] = useState(false);

  const [confirmVentaModalOpen, setConfirmVentaModalOpen] = useState(false);
  const getRoomId = (room: any) => String(room?.id_habitacion ?? room?.id ?? '');
  const getRoomName = (room: any) => room?.nombre || room?.name || `Habitación ${getRoomId(room)}`;

  useEffect(() => {
    if (!open) return;

    fetch('/api/rooms')
      .then(res => res.json())
      .then(data => {
        if (data.success) setRooms(data.data);
      });
  }, [open]);

  useEffect(() => {
    const handleCloseOrderModal = (event: CustomEvent) => {
      const { orderId: processedOrderId } = event.detail;
      if (open && orderId === processedOrderId) {
        onClose();
      }
    };

    window.addEventListener('closeOrderModal', handleCloseOrderModal as EventListener);

    return () => {
      window.removeEventListener('closeOrderModal', handleCloseOrderModal as EventListener);
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
      console.error('[ORDER MODAL] ❌ Error buscando habitación activa:', error);
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

  const isChampagneProduct = (producto: any) => {
    const categoria = (producto?.categoria || '').toLowerCase();
    return (
      categoria.includes('champaña') ||
      categoria.includes('shampaña') ||
      categoria.includes('champagne')
    );
  };

  const computeHostessLimit = (items: any[]) => {
    const champagneProducts = items.filter(isChampagneProduct);
    const otherCommissionProducts = items.filter(
      p =>
        !isChampagneProduct(p) &&
        (Number(p.genera_comision) === 1 || Number(p.generaComision) === 1)
    );

    const otherCommissionQuantity = otherCommissionProducts.reduce(
      (sum, p) => sum + (Number(p.cantidad) || 1),
      0
    );

    let champagneLimit = 0;
    let maxChampagnePrice = 0;

    if (champagneProducts.length > 0) {
      maxChampagnePrice = Math.max(...champagneProducts.map(p => Number(p.precio || p.price || 0)));

      if (maxChampagnePrice >= 240000) champagneLimit = 5;
      else if (maxChampagnePrice >= 200000) champagneLimit = 4;
      else if (maxChampagnePrice >= 140000) champagneLimit = 3;
      else if (maxChampagnePrice >= 120000) champagneLimit = 2;
      else champagneLimit = 1;
    }

    const maxAnfitrionas =
      champagneProducts.length > 0
        ? champagneLimit + otherCommissionQuantity
        : otherCommissionQuantity;

    return {
      maxAnfitrionas,
      champagneLimit,
      otherCommissionQuantity,
      hasChampagneProducts: champagneProducts.length > 0,
      maxChampagnePrice
    };
  };

  const hostessLimits = computeHostessLimit(detail);
  const {
    maxAnfitrionas,
    champagneLimit,
    otherCommissionQuantity,
    hasChampagneProducts,
    maxChampagnePrice
  } = hostessLimits;

  const anfitrionasDelPedido =
    detail[0]?.anfitrionas_con_ids ||
    detail[0]?.anfitrionas ||
    detail[0]?.anfitriona ||
    detail[0]?.usuarios ||
    detail[0]?.hostesses ||
    [];

  const anfitrionasArray = Array.isArray(anfitrionasDelPedido)
    ? anfitrionasDelPedido
    : anfitrionasDelPedido
      ? [anfitrionasDelPedido]
      : [];

  const anfitrionaString = detail[0]?.anfitriona;
  const anfitrionasFinal =
    anfitrionasArray.length > 0 ? anfitrionasArray : anfitrionaString ? [anfitrionaString] : [];

  const cantidadAnfitrionas = anfitrionasFinal.length;

  const recargoAnfitrionas = 0;

  useEffect(() => {
    if (cantidadAnfitrionas > maxAnfitrionas) {
      if (hasChampagneProducts) {
        const extraText =
          otherCommissionQuantity > 0
            ? ` + ${otherCommissionQuantity} por ${otherCommissionQuantity === 1 ? 'trago' : 'tragos'} con comisión`
            : '';
        toast.error(
          `El pedido excede el límite combinado de ${maxAnfitrionas} anfitriona${maxAnfitrionas !== 1 ? 's' : ''} (champaña: ${champagneLimit}${extraText})`
        );
      } else {
        toast.error(
          `El pedido excede el límite de ${maxAnfitrionas} anfitriona${maxAnfitrionas !== 1 ? 's' : ''} para productos con comisión`
        );
      }
    }
  }, [hasChampagneProducts, maxChampagnePrice, maxAnfitrionas, cantidadAnfitrionas, detail]);

  const handleRegistrarVenta = async (e?: React.MouseEvent) => {
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
      toast.error(
        'Para productos de champaña es obligatorio tener al menos una anfitriona en el pedido'
      );
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
        ? rooms.find(room => getRoomId(room) === String(habitacionId))
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
        window.dispatchEvent(
          new CustomEvent('updatePendingOrders', {
            detail: { type: 'order-processed', orderId: orderId }
          })
        );
        window.dispatchEvent(new CustomEvent('refreshNotifications'));

        if (habitacionId) {
          const selectedRoom = rooms.find(room => getRoomId(room) === String(habitacionId));
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
                  selectedRoom.id ?? selectedRoom.id_habitacion,
                  getRoomName(selectedRoom),
                  tiempoHabitacion,
                  resultado.data?.codigo || `VENTA_${orderId}`,
                  detail[0]?.cliente || 'cliente sin registrar',
                  detail[0]?.anfitriona || '',
                  'venta',
                  detail[0]?.garzon || undefined
                );
              } else {
                toast.error('Error al actualizar estado de habitación');
              }
            } catch (error) {
              toast.error('Error al actualizar estado de habitación');
            }
          }
        }

        toast.success('Venta registrada exitosamente');
        window.dispatchEvent(new CustomEvent('ventaRegistrada'));
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
      window.dispatchEvent(
        new CustomEvent('updatePendingOrders', {
          detail: { type: 'order-deleted', orderId: orderId }
        })
      );
      window.dispatchEvent(new CustomEvent('refreshNotifications'));
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
        total: sub_total + recargoAnfitrionas, // Sin propina para cuentas
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

      // Crear la cuenta
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
          // Marcar el pedido como procesado porque se convirtió en una cuenta
          await actualizarEstadoPedido(0);
          window.dispatchEvent(
            new CustomEvent('updatePendingOrders', {
              detail: { type: 'order-processed', orderId: orderId }
            })
          );
          window.dispatchEvent(new CustomEvent('refreshNotifications'));
        } catch (estadoError) {
          console.error(
            '[ORDER MODAL] Error al actualizar estado del pedido a procesado:',
            estadoError
          );
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

  // Filtrar habitaciones activas, pero incluir la habitación pre-seleccionada aunque esté ocupada
  const habitacionesActivas = rooms.filter(room => {
    // Incluir habitaciones disponibles (status = 1)
    if ((room.status ?? room.estado) === 1) return true;

    // También incluir la habitación pre-seleccionada aunque esté ocupada
    if (habitacionId && getRoomId(room) === String(habitacionId)) {
      return true;
    }

    return false;
  });

  const hasChampagne = detail.some((item: any) => {
    const cat = (item.categoria || '').toLowerCase();
    return cat.includes('champaña') || cat.includes('shampaña') || cat.includes('champagne');
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
            {/* Contenido con scroll */}
            <div className='flex-1 overflow-y-auto px-4 sm:px-6 py-4'>
              <div className='space-y-6'>
                {/* Info general */}
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                  {/* Columna izquierda - Información del pedido */}
                  <div className='space-y-3'>
                    <div className='flex justify-between items-center'>
                      <span className='text-xs sm:text-sm text-muted-foreground'>
                        Fecha y Hora:
                      </span>
                      <div className='text-xs sm:text-sm font-medium'>
                        <div>{formatLongDateEs(detail[0]?.fecha_crea)}</div>
                        <div>{formatShortTimeEs(detail[0]?.fecha_crea)}</div>
                      </div>
                    </div>
                    <Separator />
                    <div className='flex justify-between items-center'>
                      <span className='text-xs sm:text-sm text-muted-foreground'>Código:</span>
                      <Badge variant='outline' className='text-xs'>
                        {detail[0]?.codigo}
                      </Badge>
                    </div>
                    <Separator />
                    <div className='flex justify-between items-center'>
                      <span className='text-xs sm:text-sm text-muted-foreground'>
                        Anfitriona(s):
                      </span>
                      <span className='text-xs sm:text-sm font-medium'>
                        {detail[0]?.anfitriona || '-'}
                      </span>
                    </div>
                    <Separator />
                    <div className='flex justify-between items-center'>
                      <span className='text-xs sm:text-sm text-muted-foreground'>Cliente:</span>
                      <span className='text-xs sm:text-sm font-medium'>{detail[0]?.cliente}</span>
                    </div>
                    <Separator />
                    <div className='flex justify-between items-center'>
                      <span className='text-xs sm:text-sm text-muted-foreground'>Garzón:</span>
                      <span className='text-xs sm:text-sm font-medium'>{detail[0]?.garzon}</span>
                    </div>

                    {hasChampagneProducts && cantidadAnfitrionas === 0 && (
                      <>
                        <Separator />
                        <div className='text-xs text-red-500'>
                          ⚠️ Se requiere al menos una anfitriona para productos de champaña
                        </div>
                      </>
                    )}
                    {cantidadAnfitrionas > maxAnfitrionas && (
                      <>
                        <Separator />
                        <div className='text-xs text-red-500'>
                          ⚠️ Excede el límite combinado de {maxAnfitrionas} anfitriona(s)
                        </div>
                      </>
                    )}
                  </div>

                  {/* Columna derecha - Formulario de pago */}
                  <div className='space-y-4'>
                    <div>
                      <PaymentMethodSelect
                        value={metodoPago}
                        onChange={setMetodoPago}
                        label='Método de pago'
                        placeholder='Seleccione un método de pago'
                        required={true}
                        className={showMetodoPagoError && !metodoPago ? 'border-red-300' : ''}
                      />
                      {showMetodoPagoError && !metodoPago && (
                        <div className='text-xs text-red-500 mt-1'>
                          ⚠️ El método de pago es obligatorio
                        </div>
                      )}
                    </div>
                    {shouldShowRoomSelector && (
                      <>
                        <RoomSelect
                          habitaciones={habitacionesActivas}
                          value={habitacionId}
                          onChange={setHabitacionId}
                          label='Habitación (opcional)'
                          placeholder='Seleccione una habitación'
                          searchPlaceholder='Buscar habitación...'
                          filterByStatus={1}
                          includeRoomIds={habitacionId ? [habitacionId] : []}
                          showTime={true}
                          disabled={hasRoomSelectedInOrder}
                          disabledReason={
                            hasRoomSelectedInOrder
                              ? 'Este pedido ya viene con una habitación seleccionada y no se puede cambiar.'
                              : undefined
                          }
                        />
                        {habitacionId && (
                          <div>
                            <Label className={ORDER_FIELD_LABEL_CLASS}>
                              Tiempo de uso (minutos)
                            </Label>
                            <Select
                              value={tiempoHabitacion.toString()}
                              onValueChange={(val: string) => setTiempoHabitacion(Number(val))}
                            >
                              <SelectTrigger className={ORDER_FIELD_TRIGGER_CLASS}>
                                <SelectValue placeholder='Seleccionar tiempo' />
                              </SelectTrigger>
                              <SelectContent className={ORDER_FIELD_POPOVER_CLASS}>
                                <SelectItem
                                  value='5'
                                  className='text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                                >
                                  5 minutos
                                </SelectItem>
                                <SelectItem
                                  value='10'
                                  className='text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                                >
                                  10 minutos
                                </SelectItem>
                                <SelectItem
                                  value='15'
                                  className='text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                                >
                                  15 minutos
                                </SelectItem>
                                <SelectItem
                                  value='20'
                                  className='text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                                >
                                  20 minutos
                                </SelectItem>
                                <SelectItem
                                  value='25'
                                  className='text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                                >
                                  25 minutos
                                </SelectItem>
                                <SelectItem
                                  value='30'
                                  className='text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                                >
                                  30 minutos
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </>
                    )}
                    <div>
                      <Label className={ORDER_FIELD_LABEL_CLASS}>Propina</Label>
                      <div className='flex items-center space-x-2'>
                        <div className='relative flex-1'>
                          <Coins className='absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground' />
                          <Input
                            className={`${ORDER_FIELD_INPUT_CLASS} pl-8`}
                            placeholder='Sin propina'
                            type='text'
                            value={propinaDisplayValue}
                            readOnly
                          />
                        </div>
                        <div className='flex items-center space-x-2'>
                          <Checkbox
                            id='agregar-propina'
                            checked={agregarPropina}
                            onCheckedChange={checked => setAgregarPropina(checked === true)}
                            disabled={detail[0]?.propina > 0} // Deshabilitar si ya hay propina original
                          />
                          <label
                            htmlFor='agregar-propina'
                            className='cursor-pointer whitespace-nowrap text-xs text-gray-700 dark:text-zinc-300'
                          >
                            10%
                          </label>
                        </div>
                      </div>
                      {agregarPropina && (
                        <div className='text-xs text-green-600 mt-1'>
                          {detail[0]?.propina > 0
                            ? `✓ Propina original: ${formatCurrencyCLP(propina)}`
                            : `✓ Propina del 10%: ${formatCurrencyCLP(propina)}`}
                        </div>
                      )}
                      {detail[0]?.propina > 0 && (
                        <div className='text-xs text-blue-600 mt-1'>
                          ℹ️ Este pedido ya incluye propina del cliente
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className={ORDER_FIELD_LABEL_CLASS}>Total Comisión</Label>
                      <div className='relative'>
                        <DollarSign className='absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground' />
                        <Input
                          className={`${ORDER_FIELD_INPUT_WITH_ICON_CLASS} font-semibold`}
                          value={formatNumberCL(detail[0]?.total_comision || 0)}
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabla de productos */}
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
                          Comisión
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

                  {/* Resumen de totales */}
                  <div className='space-y-2'>
                    <div className='flex justify-between items-center text-sm'>
                      <span className='text-muted-foreground'>SUBTOTAL:</span>
                      <span className='font-semibold'>{formatCurrencyCLP(detail[0]?.total)}</span>
                    </div>
                    {propina > 0 && (
                      <div className='flex justify-between items-center text-sm'>
                        <span className='text-blue-600'>+ Propina:</span>
                        <span className='text-blue-600 font-medium'>
                          {formatCurrencyCLP(propina)}
                        </span>
                      </div>
                    )}
                    {recargoAnfitrionas > 0 && (
                      <div className='flex justify-between items-center text-sm'>
                        <span className='text-orange-600'>+ Recargo anfitrionas:</span>
                        <span className='text-orange-600 font-medium'>
                          {formatCurrencyCLP(recargoAnfitrionas)}
                        </span>
                      </div>
                    )}
                    <Separator />
                    <div className='flex justify-between items-center text-base'>
                      <span className='font-bold'>TOTAL:</span>
                      <span className='font-bold text-lg'>
                        {formatCurrencyCLP((detail[0]?.total || 0) + propina + recargoAnfitrionas)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Footer con botones - fijo en la parte inferior */}
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

      {/* Modal de confirmación de registro de venta */}
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
