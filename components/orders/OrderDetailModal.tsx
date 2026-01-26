'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Coins, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import PaymentMethodSelect from '@/components/ui/PaymentMethodSelect';
import RoomSelect from '@/components/ui/RoomSelect';
import { useSales } from '@/hooks/useSales';
import { toast } from 'sonner';
import { useTimer } from '@/contexts/TimerContext';

function formatFecha(fechaStr?: string) {
  if (!fechaStr) return '-';
  // Si es formato ISO (contiene 'T')
  if (fechaStr.includes('T')) {
    const date = new Date(fechaStr);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  }
  // Si es formato SQL (YYYY-MM-DD HH:mm:ss)
  const [fecha] = fechaStr.split(' ');
  if (!fecha) return '-';
  const [y, m, d] = fecha.split('-');
  return `${d}-${m}-${y}`;
}
function formatHora(fechaStr?: string) {
  if (!fechaStr) return '-';
  // Si es formato ISO (contiene 'T')
  if (fechaStr.includes('T')) {
    const date = new Date(fechaStr);
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${min}`;
  }
  // Si es formato SQL (YYYY-MM-DD HH:mm:ss)
  const parts = fechaStr.split(' ');
  if (parts[1]) {
    const [h, m] = parts[1].split(':');
    return `${h}:${m}`;
  }
  return '-';
}

interface OrderDetailModalProps {
  open: boolean;
  onClose: () => void;
  detail: any[];
  isLoading: boolean;
  error: string | null;
  orderId?: number | null;
  orderCode?: string; // Código del pedido
  onVentaRegistrada?: () => void;
  onOrderStatusChange?: () => void; // Nueva prop para actualizar el header
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
  const [propinaDisplayValue, setPropinaDisplayValue] = useState('');
  const [showMetodoPagoError, setShowMetodoPagoError] = useState(false);
  const [agregarPropina, setAgregarPropina] = useState(false);

  // Estados para el modal de confirmación de venta
  const [confirmVentaModalOpen, setConfirmVentaModalOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch('/api/rooms')
      .then(res => res.json())
      .then(data => {
        if (data.success) setRooms(data.data);
      });
  }, [open]);

  // Limpiar estados cuando se cierre el modal
  useEffect(() => {
    if (!open) {
      setMetodoPago('');
      setPropina(0);
      setHabitacionId('');
      setPropinaDisplayValue('');
      setShowMetodoPagoError(false);
      setIsRegistering(false);
      setAgregarPropina(false);
      setConfirmVentaModalOpen(false);
    }
  }, [open]);

  // Calcular propina automáticamente cuando se marca/desmarca el checkbox
  useEffect(() => {
    if (agregarPropina && detail && detail.length > 0) {
      const totalPedido = detail[0]?.total || 0;
      const propinaCalculada = Math.round(totalPedido * 0.1);
      setPropina(propinaCalculada);
      setPropinaDisplayValue(propinaCalculada.toLocaleString('es-CL'));
    } else {
      setPropina(0);
      setPropinaDisplayValue('');
    }
  }, [agregarPropina, detail]);

  // Ocultar error de método de pago cuando se selecciona uno
  useEffect(() => {
    if (metodoPago && showMetodoPagoError) {
      setShowMetodoPagoError(false);
    }
  }, [metodoPago, showMetodoPagoError]);

  // Lógica de champaña y anfitrionas
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
      maxChampagnePrice = Math.max(
        ...champagneProducts.map(p => Number(p.precio || p.price || 0))
      );

      if (maxChampagnePrice >= 240000) champagneLimit = 5;
      else if (maxChampagnePrice >= 200000) champagneLimit = 4;
      else if (maxChampagnePrice >= 140000) champagneLimit = 3;
      else if (maxChampagnePrice >= 120000) champagneLimit = 2;
      else champagneLimit = 1;
    }

    const maxAnfitrionas = champagneProducts.length > 0
      ? champagneLimit + otherCommissionQuantity
      : otherCommissionQuantity;

    return {
      maxAnfitrionas,
      champagneLimit,
      otherCommissionQuantity,
      hasChampagneProducts: champagneProducts.length > 0,
      maxChampagnePrice,
    };
  };

  const hostessLimits = computeHostessLimit(detail);
  const {
    maxAnfitrionas,
    champagneLimit,
    otherCommissionQuantity,
    hasChampagneProducts,
    maxChampagnePrice,
  } = hostessLimits;

  // Obtener las anfitrionas del pedido
  // Buscar en diferentes campos posibles donde pueden venir las anfitrionas
  const anfitrionasDelPedido =
    detail[0]?.anfitrionas_con_ids ||
    detail[0]?.anfitrionas ||
    detail[0]?.anfitriona ||
    detail[0]?.usuarios ||
    detail[0]?.hostesses ||
    [];

  // Si viene como string, convertirlo a array
  const anfitrionasArray = Array.isArray(anfitrionasDelPedido)
    ? anfitrionasDelPedido
    : anfitrionasDelPedido
      ? [anfitrionasDelPedido]
      : [];

  // Si no hay anfitrionas en los arrays, buscar en el campo anfitriona como string
  const anfitrionaString = detail[0]?.anfitriona;
  const anfitrionasFinal =
    anfitrionasArray.length > 0 ? anfitrionasArray : anfitrionaString ? [anfitrionaString] : [];

  const cantidadAnfitrionas = anfitrionasFinal.length;

  // No hay recargos por anfitrionas adicionales en las nuevas reglas
  const recargoAnfitrionas = 0;

  // Validar que las anfitrionas del pedido cumplan con las reglas
  useEffect(() => {
    if (cantidadAnfitrionas > maxAnfitrionas) {
      if (hasChampagneProducts) {
        const extraText = otherCommissionQuantity > 0
          ? ` + ${otherCommissionQuantity} por ${otherCommissionQuantity === 1 ? 'trago' : 'tragos'} con comisión`
          : '';
        toast.error(`El pedido excede el límite combinado de ${maxAnfitrionas} anfitriona${maxAnfitrionas !== 1 ? 's' : ''} (champaña: ${champagneLimit}${extraText})`);
      } else {
        toast.error(`El pedido excede el límite de ${maxAnfitrionas} anfitriona${maxAnfitrionas !== 1 ? 's' : ''} para productos con comisión`);
      }
    }
  }, [hasChampagneProducts, maxChampagnePrice, maxAnfitrionas, cantidadAnfitrionas, detail]);

  const handleRegistrarVenta = async () => {
    // Activar validación visual del método de pago
    setShowMetodoPagoError(true);

    if (!metodoPago) {
      toast.error('Selecciona un método de pago');
      return;
    }

    if (!detail || detail.length === 0) {
      toast.error('No hay detalles del pedido');
      return;
    }

    // Validar que si hay productos de champaña, las anfitrionas sean obligatorias
    if (hasChampagneProducts && cantidadAnfitrionas === 0) {
      toast.error(
        'Para productos de champaña es obligatorio tener al menos una anfitriona en el pedido'
      );
      return;
    }

    // Validar regla de anfitrionas con el esquema combinado
    if (cantidadAnfitrionas > maxAnfitrionas) {
      const extraText = hasChampagneProducts && otherCommissionQuantity > 0
        ? ` + ${otherCommissionQuantity} por ${otherCommissionQuantity === 1 ? 'trago' : 'tragos'} con comisión`
        : '';
      toast.error(`El pedido excede el límite combinado de ${maxAnfitrionas} anfitriona${maxAnfitrionas !== 1 ? 's' : ''} (champaña: ${champagneLimit}${extraText})`);
      return;
    }

    // Si todas las validaciones pasan, abrir modal de confirmación
    setConfirmVentaModalOpen(true);
  };

  const handleConfirmRegistrarVenta = async () => {

    setIsRegistering(true);
    try {
      // Obtener información del pedido
      const pedido = detail[0];

      // Calcular el total de comisiones
      const total_comision =
        detail.reduce((acc, item) => acc + (item.comision || 0), 0) + recargoAnfitrionas;

      // Calcular sub_total (suma de precios de productos)
      const sub_total = detail.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

      // Extraer IDs de usuarios de manera más robusta
      const usuariosIds = anfitrionasFinal
        .map((anfitriona: any) => {
          // Si es un objeto con usuario_id (nuevo formato del endpoint)
          if (typeof anfitriona === 'object' && anfitriona.usuario_id) {
            return anfitriona.usuario_id;
          }
          // Si es un objeto con ID
          if (typeof anfitriona === 'object' && anfitriona.id) {
            return anfitriona.id;
          }
          // Si es un número, usarlo directamente
          if (typeof anfitriona === 'number') {
            return anfitriona;
          }
          // Si es un string, intentar convertir a número
          if (typeof anfitriona === 'string') {
            // Formato "ID - Nombre"
            const match = anfitriona.match(/^(\d+)\s*-\s*(.+)$/);
            if (match) {
              return parseInt(match[1]);
            }
            // Intentar parse directo
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

      // Preparar datos para la venta
      const ventaData = {
        cliente_id: pedido.cliente_id || null, // Usar el cliente_id del pedido o NULL
        pedido_id: orderId || null, // Guardar el ID del pedido
        metodo_pago: metodoPago as 'efectivo' | 'tarjeta' | 'transferencia',
        propina: propina,
        sub_total: sub_total, // Suma del precio de los productos
        total: (pedido.total || 0) + propina + recargoAnfitrionas, // Total final con propina y recargos
        detalles: detail.map((item: any) => ({
            producto_id: item.id_producto || item.producto_id, // Usar el ID real del producto
            precio: item.precio || 0,
          cantidad: item.cantidad || 0,
          comision: item.comision || 0, // Agregar la comisión del producto
          sub_total: (item.precio || 0) * (item.cantidad || 0), // Calcular sub_total por producto
          hostess_id: item.hostess_id || null, // Anfitriona asignada a este producto específico
        })),
        usuarios: usuariosIds,
        habitacion_id: habitacionId ? parseInt(habitacionId) : undefined // Campo opcional de habitación
      };

  

      const resultado = await createVenta(ventaData);
      if (resultado && resultado.success) {
        // Registrar propina si hay un monto
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
                `Propina de $${propina.toLocaleString()} registrada y distribuida entre ${dataPropina.data.usuarios_distribucion
                } usuarios`
              );
            } else {
              // Si no hay usuarios logueados, mostrar advertencia pero continuar
              if (dataPropina.message?.includes('No hay usuarios logueados')) {
                toast.warning(
                  `Venta registrada con propina de $${propina.toLocaleString()}, pero no se distribuyó porque no hay cajeros/garzones logueados`
                );
              } else {
                toast.error('Error al registrar la propina: ' + dataPropina.message);
              }
            }
          } catch (error) {
            toast.warning(
              `Venta registrada con propina de $${propina.toLocaleString()}, pero hubo un error al distribuirla`
            );
          }
        }

        // Cambiar estado del pedido a 0 (procesado)
        await actualizarEstadoPedido(0);

        // Actualizar el contador de la campanita en el header
        onOrderStatusChange?.();

        // Si se seleccionó una habitación, actualizar estado e iniciar temporizador
        if (habitacionId) {
          const selectedRoom = rooms.find(room => room.id === parseInt(habitacionId));
          if (selectedRoom) {
            try {
              // Actualizar estado de la habitación a ocupada (2)
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
                  orderId || 0, // servicioId (usar orderId para ventas)
                  selectedRoom.id, // roomId
                  selectedRoom.name, // roomName
                  selectedRoom.time || 60, // duration
                  `VENTA_${orderId}`, // servicioCode (ID de venta único)
                  'Cliente Venta' // clienteNombre (placeholder para ventas)
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
        onClose();
        onVentaRegistrada?.(); // Llamar al callback cuando se registra la venta
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
      // Cambiar estado del pedido a 2 (rechazado)
      await actualizarEstadoPedido(2);
      toast.success('Pedido rechazado exitosamente');
      onClose();
      onVentaRegistrada?.(); // Llamar al callback para refrescar la lista
    } catch (error) {
      toast.error('Error al rechazar el pedido');
    }
  };

  const handleRegistrarCuenta = async () => {
    setIsRegistering(true);
    try {
      // Obtener información del pedido
      const pedido = detail[0];

      // Calcular el total de comisiones
      const total_comision =
        detail.reduce((acc, item) => acc + (item.comision || 0), 0) + recargoAnfitrionas;

      // Calcular sub_total (suma de precios de productos)
      const sub_total = detail.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

      // Generar código único para la cuenta
      const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      // Obtener IDs de anfitrionas del pedido
      const anfitrionasIds = detail[0]?.anfitrionas_con_ids?.map((anfitriona: any) => anfitriona.usuario_id) || [];

      // Preparar datos para la cuenta
      const cuentaData = {
        codigo: generateCode(),
        cliente_id: pedido.cliente_id || 1,
        total_comision: total_comision,
        sub_total: sub_total,
        total: (pedido.total || 0) + recargoAnfitrionas, // Sin propina para cuentas
        habitacion_id: habitacionId ? parseInt(habitacionId) : null,
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
        onClose();
        onVentaRegistrada?.(); // Llamar al callback cuando se registra la cuenta
        onOrderStatusChange?.(); // Actualizar el contador de pedidos pendientes
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

  const habitacionesActivas = rooms.filter(room => room.status === 1);
  const hasChampagne = detail.some((item: any) => {
    const cat = (item.categoria || '').toLowerCase();
    return cat.includes('champaña') || cat.includes('shampaña') || cat.includes('champagne');
  });

  // Verificar si el cliente está registrado
  const isClienteRegistrado = () => {
    const cliente = detail[0]?.cliente;
    return cliente && 
           cliente.toLowerCase() !== 'cliente no registrado' && 
           cliente.toLowerCase() !== 'sin cliente' &&
           cliente.trim() !== '' &&
           cliente !== '-';
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
                      <span className='text-xs sm:text-sm text-muted-foreground'>Fecha y Hora:</span>
                      <div className='text-xs sm:text-sm font-medium'>
                        <div>{formatFecha(detail[0]?.fecha_crea)}</div>
                        <div>{formatHora(detail[0]?.fecha_crea)}</div>
                      </div>
                    </div>
                    <Separator />
                    <div className='flex justify-between items-center'>
                      <span className='text-xs sm:text-sm text-muted-foreground'>Código:</span>
                      <Badge variant='outline' className='text-xs'>{detail[0]?.codigo}</Badge>
                    </div>
                    <Separator />
                    <div className='flex justify-between items-center'>
                      <span className='text-xs sm:text-sm text-muted-foreground'>Anfitriona(s):</span>
                      <span className='text-xs sm:text-sm font-medium'>{detail[0]?.anfitriona || '-'}</span>
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
                    {hasChampagne && (
                      <RoomSelect
                        habitaciones={habitacionesActivas}
                        value={habitacionId}
                        onChange={setHabitacionId}
                        label='Habitación'
                        placeholder='Seleccione una habitación'
                        searchPlaceholder='Buscar habitación...'
                        filterByStatus={1}
                        showTime={true}
                      />
                    )}
                    <div>
                      <Label className='block text-xs font-medium text-muted-foreground mb-2'>Propina</Label>
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
                            id="agregar-propina"
                            checked={agregarPropina}
                            onCheckedChange={(checked) => setAgregarPropina(checked === true)}
                          />
                          <label htmlFor="agregar-propina" className='text-xs text-gray-700 whitespace-nowrap cursor-pointer'>
                            10%
                          </label>
                        </div>
                      </div>
                      {agregarPropina && (
                        <div className='text-xs text-green-600 mt-1'>
                          ✓ Propina del 10%: ${propina.toLocaleString('es-CL')}
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
                          value={(detail[0]?.total_comision || 0).toLocaleString('es-CL')}
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
                          <TableCell className='text-center'>${item.precio?.toLocaleString('es-CL')}</TableCell>
                          <TableCell className='text-center'>${item.comision?.toLocaleString('es-CL')}</TableCell>
                          <TableCell className='text-right font-medium'>${item.subtotal?.toLocaleString('es-CL')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <Separator className='my-4' />

                  {/* Resumen de totales */}
                  <div className='space-y-2'>
                    <div className='flex justify-between items-center text-sm'>
                      <span className='text-muted-foreground'>SUBTOTAL:</span>
                      <span className='font-semibold'>${detail[0]?.total?.toLocaleString('es-CL')}</span>
                    </div>
                    {propina > 0 && (
                      <div className='flex justify-between items-center text-sm'>
                        <span className='text-blue-600'>+ Propina:</span>
                        <span className='text-blue-600 font-medium'>${propina.toLocaleString('es-CL')}</span>
                      </div>
                    )}
                    {recargoAnfitrionas > 0 && (
                      <div className='flex justify-between items-center text-sm'>
                        <span className='text-orange-600'>+ Recargo anfitrionas:</span>
                        <span className='text-orange-600 font-medium'>${recargoAnfitrionas.toLocaleString('es-CL')}</span>
                      </div>
                    )}
                    <Separator />
                    <div className='flex justify-between items-center text-base'>
                      <span className='font-bold'>TOTAL:</span>
                      <span className='font-bold text-lg'>
                        ${((detail[0]?.total || 0) + propina + recargoAnfitrionas).toLocaleString('es-CL')}
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
                  >
                    {isRegistering ? 'Registrando...' : 'Registrar Cuenta'}
                  </Button>
                )}

                <Button
                  size='sm'
                  variant='outline'
                  className='rounded-full px-4 sm:px-6 bg-gray-500 text-white hover:bg-gray-600 hover:scale-105 transition-all duration-200 text-xs sm:text-sm w-full sm:w-auto'
                  onClick={onClose}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar registro de venta</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas registrar esta venta?
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4">
            <div className="space-y-2 text-sm">
              <div><strong>Pedido:</strong> {orderCode}</div>
              <div><strong>Total:</strong> ${((detail[0]?.total || 0) + propina + recargoAnfitrionas).toLocaleString('es-CL')}</div>
              <div><strong>Método de pago:</strong> {metodoPago}</div>
              {propina > 0 && (
                <div><strong>Propina:</strong> ${propina.toLocaleString('es-CL')}</div>
              )}
              {habitacionId && (
                <div><strong>Habitación:</strong> {rooms.find(r => r.id === parseInt(habitacionId))?.name || habitacionId}</div>
              )}
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleCancelRegistrarVenta}
              disabled={isRegistering}
              className="rounded-full"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmRegistrarVenta}
              disabled={isRegistering}
              className="rounded-full bg-green-600 hover:bg-green-700"
            >
              {isRegistering ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Registrando...
                </>
              ) : (
                'Confirmar Venta'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
