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

interface OrderDetailModalProps {
  open: boolean;
  onClose: () => void;
  detail: any[];
  isLoading: boolean;
  error: string | null;
  orderId?: number | null;
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
  const [tiempoHabitacion, setTiempoHabitacion] = useState(30); // Tiempo en minutos, por defecto 30
  const [propinaDisplayValue, setPropinaDisplayValue] = useState('');
  const [showMetodoPagoError, setShowMetodoPagoError] = useState(false);
  const [agregarPropina, setAgregarPropina] = useState(false);

  const [confirmVentaModalOpen, setConfirmVentaModalOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Cargar TODAS las habitaciones (disponibles y ocupadas) para poder mostrar la pre-seleccionada
    fetch('/api/rooms')
      .then(res => res.json())
      .then(data => {
        if (data.success) setRooms(data.data);
      });
  }, [open]);

  // Escuchar evento para cerrar el modal cuando se procese el pedido
  useEffect(() => {
    const handleCloseOrderModal = (event: CustomEvent) => {
      const { orderId: processedOrderId } = event.detail;
      console.log('🔔 [ORDER MODAL] Evento closeOrderModal recibido:', processedOrderId);
      console.log('🔔 [ORDER MODAL] Modal abierto:', open);
      console.log('🔔 [ORDER MODAL] Order ID actual:', orderId);

      // Si el modal está abierto y es el pedido que se procesó, cerrarlo
      if (open && orderId === processedOrderId) {
        console.log('✅ [ORDER MODAL] Cerrando modal automáticamente...');
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
      // Cuando se abre el modal, verificar si el pedido ya tiene propina
      if (detail && detail.length > 0) {
        const propinaOriginal = detail[0]?.propina || 0;

        if (propinaOriginal > 0) {
          setPropina(propinaOriginal);
          setPropinaDisplayValue(formatNumberCL(propinaOriginal));
          setAgregarPropina(true);
        }

        // Pre-seleccionar habitación si viene en algún detalle del pedido
        // Buscar en todos los detalles, no solo en el primero
        const detalleConHabitacion = detail.find(d => d.habitacion_id);
        if (detalleConHabitacion && detalleConHabitacion.habitacion_id) {
          const habitacionId = String(detalleConHabitacion.habitacion_id);
          setHabitacionId(habitacionId);
          console.log(
            '[ORDER MODAL] 🏠 Habitación auto-seleccionada del pedido (guardada):',
            habitacionId
          );
        } else {
          // Si no hay habitación guardada, buscar dinámicamente si alguna anfitriona está en venta activa
          buscarHabitacionActiva();
        }
      }
    }
  }, [open, detail]);

  // Función para buscar si alguna anfitriona del pedido está en una venta activa con habitación
  const buscarHabitacionActiva = async () => {
    if (!detail || detail.length === 0) {
      console.log('[ORDER MODAL] ⚠️ No hay detalles del pedido');
      return;
    }

    try {
      console.log('[ORDER MODAL] 📋 Detalles del pedido:', detail);

      // Obtener IDs de todas las anfitrionas del pedido
      const anfitrionasIds: number[] = [];

      // Obtener anfitrionas del primer detalle (anfitrionas generales del pedido)
      const anfitrionaIdsStr = detail[0]?.anfitrionaIds;
      console.log('[ORDER MODAL] 📝 anfitrionaIds del detalle[0]:', anfitrionaIdsStr);

      if (anfitrionaIdsStr) {
        const ids = anfitrionaIdsStr
          .split(',')
          .map((id: string) => parseInt(id.trim()))
          .filter((id: number) => !isNaN(id));
        anfitrionasIds.push(...ids);
        console.log('[ORDER MODAL] ✅ IDs extraídos de anfitrionaIds:', ids);
      }

      // También obtener anfitrionas asignadas específicamente a productos
      detail.forEach((d, index) => {
        console.log(`[ORDER MODAL] 📝 Detalle[${index}] hostess_id:`, d.hostess_id);
        console.log(
          `[ORDER MODAL] 📝 Detalle[${index}] anfitrionas_asignadas_ids:`,
          d.anfitrionas_asignadas_ids
        );

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

      // Eliminar duplicados
      const anfitrionasUnicas = [...new Set(anfitrionasIds)];

      if (anfitrionasUnicas.length === 0) {
        console.log('[ORDER MODAL] ℹ️ No hay anfitrionas en el pedido');
        return;
      }

      console.log('[ORDER MODAL] 🔍 Buscando venta activa para anfitrionas:', anfitrionasUnicas);

      // Llamar al endpoint para verificar si alguna anfitriona está en venta activa
      const response = await fetch('/api/orders/check-active-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ anfitrionasIds: anfitrionasUnicas })
      });

      const data = await response.json();
      console.log('[ORDER MODAL] 📡 Respuesta del servidor:', data);

      if (data.success && data.hasActiveRoom && data.data) {
        const habitacionId = String(data.data.habitacionId);
        setHabitacionId(habitacionId);
        setTiempoHabitacion(data.data.tiempo || 30);
        console.log('[ORDER MODAL] ✅ Habitación auto-seleccionada (venta activa):', habitacionId);
        console.log('[ORDER MODAL] 📍 Anfitriona en venta:', data.data.anfitrionaId);
        console.log('[ORDER MODAL] 🏠 Habitación:', data.data.habitacionNombre);
        console.log('[ORDER MODAL] ⏱️ Tiempo:', data.data.tiempo, 'minutos');
      } else {
        console.log('[ORDER MODAL] ℹ️ Ninguna anfitriona está en venta activa con habitación');
      }
    } catch (error) {
      console.error('[ORDER MODAL] ❌ Error buscando habitación activa:', error);
    }
  };

  useEffect(() => {
    if (agregarPropina && detail && detail.length > 0) {
      const propinaOriginal = detail[0]?.propina || 0;
      if (propinaOriginal > 0) {
        // Si ya hay propina original, usar esa
        setPropina(propinaOriginal);
        setPropinaDisplayValue(formatNumberCL(propinaOriginal));
      } else {
        // Si no hay propina original, calcular el 10%
        const totalPedido = detail[0]?.total || 0;
        const propinaCalculada = Math.round(totalPedido * 0.1);
        setPropina(propinaCalculada);
        setPropinaDisplayValue(formatNumberCL(propinaCalculada));
      }
    } else {
      const propinaOriginal = detail[0]?.propina || 0;
      if (propinaOriginal === 0) {
        // Solo limpiar si no hay propina original
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
        ? rooms.find(room => room.id === parseInt(habitacionId))
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
        habitacion_id: shouldShowRoomSelector && habitacionId ? parseInt(habitacionId) : undefined,
        tiempo: shouldShowRoomSelector && habitacionId ? tiempoHabitacion : 0
      };

      const resultado = await createVenta(ventaData);
      if (resultado && resultado.success) {
        if (propina > 0) {
          if (!resultado.data?.id_venta) {
            return;
          }

          try {
            const resPropina = await fetch('/api/tips', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                venta_id: resultado.data.id_venta,
                monto: propina
              })
            });

            const dataPropina = await resPropina.json();

            if (dataPropina.success) {
              toast.success(
                `Propina de ${formatCurrencyCLP(propina)} registrada y distribuida entre ${
                  dataPropina.data.usuarios_distribucion
                } usuarios`
              );
            } else {
              if (dataPropina.message?.includes('No hay usuarios logueados')) {
                toast.warning(
                  `Venta registrada con propina de ${formatCurrencyCLP(propina)}, pero no se distribuyó porque no hay cajeros/garzones logueados`
                );
              } else {
                toast.error('Error al registrar la propina: ' + dataPropina.message);
              }
            }
          } catch (error) {
            toast.warning(
              `Venta registrada con propina de ${formatCurrencyCLP(propina)}, pero hubo un error al distribuirla`
            );
          }
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
          const selectedRoom = rooms.find(room => room.id === parseInt(habitacionId));
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
                  selectedRoom.id,
                  selectedRoom.name,
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
    if (room.status === 1) return true;

    // También incluir la habitación pre-seleccionada aunque esté ocupada
    if (habitacionId && room.id_habitacion === parseInt(habitacionId)) {
      console.log('[ORDER MODAL] 📍 Incluyendo habitación ocupada pre-seleccionada:', room.nombre);
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

  const isClienteRegistrado = () => {
    const cliente = detail[0]?.cliente;
    return (
      cliente &&
      cliente.toLowerCase() !== 'cliente no registrado' &&
      cliente.toLowerCase() !== 'sin cliente' &&
      cliente.trim() !== '' &&
      cliente !== '-'
    );
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='w-[95vw] max-w-[95vw] sm:w-[56rem] sm:max-w-3xl max-h-[90vh] flex flex-col p-0'>
        <DialogHeader className='px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b flex-shrink-0'>
          <DialogTitle className='text-lg sm:text-xl'>
            Detalles del Pedido - {orderCode}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className='text-center py-8 sm:py-12'>
            <div className='text-sm sm:text-base'>Cargando detalles...</div>
          </div>
        ) : error ? (
          <div className='text-center py-8 sm:py-12'>
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
                        />
                        {habitacionId && (
                          <div>
                            <Label className='block text-xs font-medium text-muted-foreground dark:text-gray-400 mb-2'>
                              Tiempo de uso (minutos)
                            </Label>
                            <Select
                              value={tiempoHabitacion.toString()}
                              onValueChange={(val: string) => setTiempoHabitacion(Number(val))}
                            >
                              <SelectTrigger className='w-full rounded-full'>
                                <SelectValue placeholder='Seleccionar tiempo' />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='5'>5 minutos</SelectItem>
                                <SelectItem value='10'>10 minutos</SelectItem>
                                <SelectItem value='15'>15 minutos</SelectItem>
                                <SelectItem value='20'>20 minutos</SelectItem>
                                <SelectItem value='25'>25 minutos</SelectItem>
                                <SelectItem value='30'>30 minutos</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </>
                    )}
                    <div>
                      <Label className='block text-xs font-medium text-muted-foreground mb-2'>
                        Propina
                      </Label>
                      <div className='flex items-center space-x-2'>
                        <div className='relative flex-1'>
                          <Coins className='absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground' />
                          <Input
                            className='pl-8 bg-gray-50'
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
                            className='text-xs text-gray-700 whitespace-nowrap cursor-pointer'
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
                      <Label className='block text-xs font-medium text-muted-foreground mb-1'>
                        Total Comisión
                      </Label>
                      <div className='relative'>
                        <DollarSign className='absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground' />
                        <Input
                          className='pl-8 font-semibold'
                          value={formatNumberCL(detail[0]?.total_comision || 0)}
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabla de productos */}
                <div className='border rounded-lg p-4'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='text-left'>Bebida</TableHead>
                        <TableHead className='text-center'>Cantidad</TableHead>
                        <TableHead className='text-center'>Precio</TableHead>
                        <TableHead className='text-center'>Comisión</TableHead>
                        <TableHead className='text-right'>Sub Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.map((item: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className='font-medium'>{item.producto}</TableCell>
                          <TableCell className='text-center'>{item.cantidad}</TableCell>
                          <TableCell className='text-center'>
                            {formatCurrencyCLP(item.precio)}
                          </TableCell>
                          <TableCell className='text-center'>
                            {formatCurrencyCLP(item.comision)}
                          </TableCell>
                          <TableCell className='text-right font-medium'>
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
            <div className='flex-shrink-0 border-t px-4 sm:px-6 py-4 bg-white'>
              <div className='flex flex-col sm:flex-row justify-center gap-2 sm:gap-4'>
                <Button
                  size='sm'
                  variant='outline'
                  className='rounded-full px-4 sm:px-6 bg-black text-white hover:scale-105 transition-all duration-200 text-xs sm:text-sm w-full sm:w-auto'
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
                    className='rounded-full px-4 sm:px-6 bg-black text-white hover:scale-105 transition-all duration-200 text-xs sm:text-sm w-full sm:w-auto'
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
                  className='rounded-full px-4 sm:px-6 bg-gray-500 text-white hover:bg-gray-600 hover:scale-105 transition-all duration-200 text-xs sm:text-sm w-full sm:w-auto'
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
          <div className='text-center py-8 sm:py-12'>
            <div className='text-sm sm:text-base text-gray-500'>No hay detalles disponibles</div>
          </div>
        )}
      </DialogContent>

      {/* Modal de confirmación de registro de venta */}
      <Dialog open={confirmVentaModalOpen} onOpenChange={setConfirmVentaModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Confirmar registro de venta</DialogTitle>
            <DialogDescription>¿Estás seguro de que deseas registrar esta venta?</DialogDescription>
          </DialogHeader>
          <div className='px-6 py-4'>
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
              className='rounded-full'
              type='button'
            >
              Cancelar
            </Button>
            <Button
              variant='outline'
              onClick={handleConfirmRegistrarVenta}
              disabled={isRegistering}
              className='rounded-full bg-green-600 hover:bg-green-700 text-white'
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
