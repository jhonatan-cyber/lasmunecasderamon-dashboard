'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Coins, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
    }
  }, [open]);

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

  // Buscar si hay algún producto de champaña
  const hasChampagneProducts = detail.some(isChampagneProduct);

  // Obtener el precio más alto de productos de champaña
  const maxChampagnePrice = Math.max(
    ...detail.filter(isChampagneProduct).map(p => Number(p.precio || 0))
  );

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

  // Determinar el máximo de anfitrionas permitidas según las reglas
  let maxAnfitrionas = 1; // Por defecto, máximo 1 anfitriona
  let anfitrionasIncluidas = 0; // Anfitrionas sin recargo
  let anfitrionasConRecargo = 0; // Anfitrionas con recargo de $40,000

  if (hasChampagneProducts) {
    if (maxChampagnePrice >= 240000) {
      // $240,000: 7 anfitrionas (5 incluidas + 2 con recargo)
      maxAnfitrionas = 7;
      anfitrionasIncluidas = 5;
      anfitrionasConRecargo = 2;
    } else if (maxChampagnePrice >= 200000) {
      // $200,000: 6 anfitrionas (4 incluidas + 2 con recargo)
      maxAnfitrionas = 6;
      anfitrionasIncluidas = 4;
      anfitrionasConRecargo = 2;
    } else if (maxChampagnePrice >= 160000) {
      // $160,000: 5 anfitrionas (3 incluidas + 2 con recargo)
      maxAnfitrionas = 5;
      anfitrionasIncluidas = 3;
      anfitrionasConRecargo = 2;
    } else if (maxChampagnePrice >= 120000) {
      // $120,000: 4 anfitrionas (2 incluidas + 2 con recargo)
      maxAnfitrionas = 4;
      anfitrionasIncluidas = 2;
      anfitrionasConRecargo = 2;
    } else {
      // Champaña con precio menor a $120,000: máximo 5 anfitrionas (sin recargo)
      maxAnfitrionas = 5;
      anfitrionasIncluidas = 5;
      anfitrionasConRecargo = 0;
    }
  }

  // Calcular recargo por anfitrionas extra según el precio de champaña
  let anfitrionasExtra = 0;
  let recargoAnfitrionas = 0;
  if (hasChampagneProducts && cantidadAnfitrionas > anfitrionasIncluidas) {
    anfitrionasExtra = cantidadAnfitrionas - anfitrionasIncluidas;
    recargoAnfitrionas = anfitrionasExtra * 40000;
  }

  // Validar que las anfitrionas del pedido cumplan con las reglas
  useEffect(() => {
    if (cantidadAnfitrionas > maxAnfitrionas) {
      // Mostrar mensaje específico según la regla aplicada
      if (!hasChampagneProducts) {
        toast.error('El pedido excede el límite de 1 anfitriona por productos sin champaña');
      } else if (maxChampagnePrice >= 240000) {
        toast.error('El pedido excede el límite de 7 anfitrionas para champaña de $240,000+');
      } else if (maxChampagnePrice >= 200000) {
        toast.error('El pedido excede el límite de 6 anfitrionas para champaña de $200,000+');
      } else if (maxChampagnePrice >= 160000) {
        toast.error('El pedido excede el límite de 5 anfitrionas para champaña de $160,000+');
      } else if (maxChampagnePrice >= 120000) {
        toast.error('El pedido excede el límite de 4 anfitrionas para champaña de $120,000+');
      } else {
        toast.error('El pedido excede el límite de 5 anfitrionas para champaña');
      }
    }
  }, [hasChampagneProducts, maxChampagnePrice, maxAnfitrionas, cantidadAnfitrionas]);

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

    // Validar regla de anfitrionas
    if (cantidadAnfitrionas > maxAnfitrionas) {
      if (!hasChampagneProducts) {
        toast.error('Para productos sin champaña solo puede haber 1 anfitriona máximo');
      } else if (maxChampagnePrice >= 240000) {
        toast.error('Para champaña de $240,000+ solo puede haber hasta 7 anfitrionas');
      } else if (maxChampagnePrice >= 200000) {
        toast.error('Para champaña de $200,000+ solo puede haber hasta 6 anfitrionas');
      } else if (maxChampagnePrice >= 160000) {
        toast.error('Para champaña de $160,000+ solo puede haber hasta 5 anfitrionas');
      } else if (maxChampagnePrice >= 120000) {
        toast.error('Para champaña de $120,000+ solo puede haber hasta 4 anfitrionas');
      } else {
        toast.error('Para productos de champaña solo puede haber hasta 5 anfitrionas');
      }
      return;
    }

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

      console.log('[OrderDetailModal] anfitrionasFinal:', anfitrionasFinal);
      console.log('[OrderDetailModal] usuariosIds extracted:', usuariosIds);

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
<<<<<<< HEAD
          producto_id: item.producto_id || item.id_producto || 1,
=======
          producto_id: item.id_producto || item.producto_id, // Usar el ID real del producto
>>>>>>> 1e378ec (oficina)
          precio: item.precio || 0,
          cantidad: item.cantidad || 0,
          comision: item.comision || 0, // Agregar la comisión del producto
          sub_total: (item.precio || 0) * (item.cantidad || 0) // Calcular sub_total por producto
        })),
        usuarios: usuariosIds,
        habitacion_id: habitacionId ? parseInt(habitacionId) : undefined // Campo opcional de habitación
      };

      console.log('[OrderDetailModal] ventaData to send:', JSON.stringify(ventaData, null, 2));

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
    }
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
      console.error('Error al registrar cuenta:', error);
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
                      <span className='text-xs sm:text-sm font-medium'>
                        {formatFecha(detail[0]?.fecha_crea)} - {formatHora(detail[0]?.fecha_crea)}
                      </span>
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
                          ⚠️ Excede el límite de {maxAnfitrionas} anfitriona(s) para este tipo de champaña
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
                      <Label className='block text-xs font-medium text-muted-foreground mb-1'>Propina</Label>
                      <div className='relative'>
                        <Coins className='absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground' />
                        <Input
                          className='pl-8'
                          placeholder='Propina'
                          type='text'
                          value={propinaDisplayValue}
                          onChange={e => {
                            const value = e.target.value;
                            const numericValue = value.replace(/\D/g, '');
                            
                            if (numericValue === '') {
                              setPropina(0);
                              setPropinaDisplayValue('');
                            } else {
                              const number = parseInt(numericValue);
                              setPropina(number);
                              setPropinaDisplayValue(number.toLocaleString('es-CL'));
                            }
                          }}
                        />
                      </div>
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
                <Button
                  size='sm'
                  variant='outline'
                  className='rounded-full px-4 sm:px-6 bg-black text-white hover:scale-105 transition-all duration-200 text-xs sm:text-sm w-full sm:w-auto'
                  onClick={handleRegistrarCuenta}
                  disabled={isRegistering}
                >
                  {isRegistering ? 'Registrando...' : 'Registrar Cuenta'}
                </Button>

                <Button
                  size='sm'
                  variant='outline'
                  className='rounded-full px-4 sm:px-6 bg-red-500 text-white hover:scale-105 transition-all duration-200 text-xs sm:text-sm w-full sm:w-auto'
                  onClick={handleRechazarPedido}
                >
                  Rechazar
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
    </Dialog>
  );
}
