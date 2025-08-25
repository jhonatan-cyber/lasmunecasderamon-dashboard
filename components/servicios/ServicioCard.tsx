'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Users, DollarSign, Home, User, Square, CreditCard } from 'lucide-react';
import { ServicioWithDetails } from '@/types/servicio';
import { formatCurrencyNoDecimals } from '@/lib/formatters';
import { useTimer } from '@/contexts/TimerContext';
import { toast } from 'sonner';

interface ServicioCardProps {
  servicio: ServicioWithDetails;
  onStopTimer?: (servicioId: number) => void;
  showAllServices?: boolean;
}

export default function ServicioCard({
  servicio,
  onStopTimer,
  showAllServices = false
}: ServicioCardProps) {
  const { getTimerByServicioId, stopTimerByServicioId, formatTime } = useTimer();
  const timer = getTimerByServicioId(servicio.id_servicio!);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('es-ES', { month: 'long' });
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const getEstadoBadge = (estado: number) => {
    // Asegurar que estado sea un número
    const estadoNum = Number(estado);

    switch (estadoNum) {
      case 0:
        return (
          <Badge className='bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 text-xs sm:text-sm'>
            Terminado
          </Badge>
        );
      case 1:
        return (
          <Badge className='bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs sm:text-sm'>
            En Proceso
          </Badge>
        );
      case 2:
        return (
          <Badge className='bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 text-xs sm:text-sm'>
            Pendiente Anulación
          </Badge>
        );
      case 3:
        return (
          <Badge className='bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-xs sm:text-sm'>
            Anulado
          </Badge>
        );
      default:
        return (
          <Badge className='bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 text-xs sm:text-sm'>
            Desconocido
          </Badge>
        );
    }
  };

  const handleStopTimer = async () => {
    try {
      // Mostrar confirmación antes de finalizar
      const Swal = (await import('sweetalert2')).default;
      const result = await Swal.fire({
        title: '¿Finalizar Servicio?',
        html: `
          <div class="text-left">
            <p><strong>Servicio:</strong> ${servicio.codigo}</p>
            <p><strong>Habitación:</strong> ${servicio.habitacion_numero || 'N/A'}</p>
            <p><strong>Cliente:</strong> ${servicio.cliente_nombre || 'N/A'}</p>
            <p class="mt-3 text-orange-600"><strong>¿Estás seguro de que quieres finalizar este servicio?</strong></p>
          </div>
        `,
        icon: 'question',
        confirmButtonText: 'Sí, Finalizar',
        confirmButtonColor: '#dc2626',
        cancelButtonText: 'Cancelar',
        cancelButtonColor: '#6b7280',
        showCancelButton: true,
        allowOutsideClick: false,
        customClass: {
          popup: 'swal2-custom-popup',
          title: 'swal2-custom-title',
          htmlContainer: 'swal2-custom-html',
          confirmButton: 'swal2-confirm-sm-outline',
          cancelButton: 'swal2-cancel-sm-outline'
        }
      });

      if (result.isConfirmed) {
        try {
          // Finalizar el servicio en el backend
          const response = await fetch(`/api/servicios/${servicio.id_servicio}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ estado: 0 })
          });

          if (response.ok) {
            // Llamar al callback del padre para actualizar la lista
            if (onStopTimer) {
              onStopTimer(servicio.id_servicio!);
            }
            // Detener el timer global
            stopTimerByServicioId(servicio.id_servicio!);
            toast.success('Servicio finalizado exitosamente');
          } else {
            toast.error('Error al finalizar el servicio');
          }
        } catch (error) {
          toast.error('Error al finalizar el servicio');
        }
      }
    } catch (error) {
      if (confirm('¿Estás seguro de que quieres finalizar este servicio?')) {
        try {
          const response = await fetch(`/api/servicios/${servicio.id_servicio}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ estado: 0 })
          });

          if (response.ok) {
            if (onStopTimer) {
              onStopTimer(servicio.id_servicio!);
            }
            stopTimerByServicioId(servicio.id_servicio!);
            toast.success('Servicio finalizado exitosamente');
          } else {
            toast.error('Error al finalizar el servicio');
          }
        } catch (error) {
          toast.error('Error al finalizar el servicio');
        }
      }
    }
  };

  return (
    <Card className='w-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 shadow-md hover:shadow-lg transition-shadow duration-200'>
      <CardHeader className='pb-3 p-4 sm:p-6'>
        <div className='flex justify-between items-start'>
          <div>
            <CardTitle className='text-base sm:text-lg font-bold text-gray-900 dark:text-neutral-100'>
              {servicio.codigo}
            </CardTitle>
            <div className='flex items-center gap-2 mt-1'>
              <User className='text-gray-400 text-xs sm:text-sm' />
              <span className='text-xs sm:text-sm text-gray-600 dark:text-neutral-300'>
                {servicio.cliente_nombre || `Cliente ${servicio.cliente_id}`}
              </span>
            </div>
          </div>
          {getEstadoBadge(servicio.estado ?? 1)}
        </div>
      </CardHeader>

      <CardContent className='space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0'>
        {/* Habitación */}
        <div className='flex items-center gap-2'>
          <Home className='text-blue-500 text-xs sm:text-sm' />
          <span className='text-xs sm:text-sm font-medium text-gray-900 dark:text-neutral-100'>
            Habitación {servicio.habitacion_numero || 'N/A'}
          </span>
        </div>

        {/* Temporizador */}
        <div
          className={`p-3 sm:p-4 rounded-lg border ${
            timer && timer.isActive && timer.remainingTime <= 300
              ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
              : 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
          }`}
        >
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Clock
                className={`text-xs sm:text-sm ${timer && timer.isActive && timer.remainingTime <= 300 ? 'text-red-500' : 'text-orange-500'}`}
              />
              <span className='text-xs sm:text-sm font-medium text-gray-700 dark:text-neutral-300'>
                {showAllServices ? `${servicio.tiempo} minutos` : 'Tiempo restante'}
              </span>
            </div>
            {timer && timer.isActive && !showAllServices && (
              <Button
                variant='outline'
                size='sm'
                onClick={handleStopTimer}
                className='h-6 px-2 text-xs border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-900/20'
              >
                <Square className='text-xs mr-1' />
                Finalizar
              </Button>
            )}
          </div>
          <div className='text-center mt-2'>
            <div
              className={`text-xl sm:text-2xl lg:text-3xl font-mono font-bold ${
                timer && timer.isActive && timer.remainingTime <= 300
                  ? 'text-red-600'
                  : 'text-orange-600'
              }`}
            >
              {showAllServices
                ? `${servicio.tiempo}:00`
                : timer
                  ? formatTime(timer.remainingTime)
                  : '00:00'}
            </div>
            {timer && timer.isActive && timer.remainingTime <= 300 && !showAllServices && (
              <div className='text-xs text-red-600 mt-1'>¡Tiempo por agotarse!</div>
            )}
          </div>
        </div>

        {/* Precios */}
        <div
          className={`grid gap-2 sm:gap-4 ${servicio.metodo_pago === 'tarjeta' && servicio.iva && servicio.iva > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}
        >
          <div className='text-center p-2 sm:p-3 bg-gray-50 dark:bg-neutral-800 rounded'>
            <div className='flex items-center justify-center gap-1 mb-1'>
              <DollarSign className='text-green-500 text-xs' />
              <span className='text-xs text-gray-600 dark:text-neutral-300'>Servicio</span>
            </div>
            <div className='font-bold text-green-600 text-sm sm:text-base'>
              {formatCurrencyNoDecimals(servicio.precio_servicio)}
            </div>
          </div>
          <div className='text-center p-2 sm:p-3 bg-gray-50 dark:bg-neutral-800 rounded'>
            <div className='flex items-center justify-center gap-1 mb-1'>
              <Home className='text-blue-500 text-xs' />
              <span className='text-xs text-gray-600 dark:text-neutral-300'>Habitación</span>
            </div>
            <div className='font-bold text-blue-600 text-sm sm:text-base'>
              {formatCurrencyNoDecimals(servicio.precio_habitacion)}
            </div>
          </div>
          {servicio.metodo_pago === 'tarjeta' && servicio.iva && servicio.iva > 0 && (
            <div className='text-center p-2 sm:p-3 bg-gray-50 dark:bg-neutral-800 rounded'>
              <div className='flex items-center justify-center gap-1 mb-1'>
                <CreditCard className='text-purple-500 text-xs' />
                <span className='text-xs text-gray-600 dark:text-neutral-300'>IVA</span>
              </div>
              <div className='font-bold text-purple-600 text-sm sm:text-base'>
                {formatCurrencyNoDecimals(servicio.iva)}
              </div>
            </div>
          )}
        </div>

        {/* Total */}
        <div className='text-center p-3 sm:p-4 bg-black text-white rounded-lg dark:bg-white dark:text-black'>
          <div className='text-xs mb-1'>TOTAL</div>
          <div className='text-lg sm:text-xl font-bold'>
            {formatCurrencyNoDecimals(servicio.total)}
          </div>
        </div>

        {/* Método de pago */}
        {servicio.metodo_pago && (
          <div className='flex items-center gap-2'>
            <CreditCard className='text-blue-500 text-xs sm:text-sm' />
            <span className='text-xs sm:text-sm text-gray-600 dark:text-neutral-300'>
              {servicio.metodo_pago}
            </span>
          </div>
        )}

        {/* Anfitrionas */}
        {servicio.anfitrionas_nombres && (
          <div className='flex items-center gap-2'>
            <Users className='text-purple-500 text-xs sm:text-sm' />
            <span className='text-xs sm:text-sm text-gray-600 dark:text-neutral-300'>
              {servicio.anfitrionas_nombres}
            </span>
          </div>
        )}

        {/* Fecha de creación */}
        {servicio.fecha_crea && (
          <div className='text-xs text-gray-400 dark:text-neutral-400 mt-2'>
            Creado: {formatDate(servicio.fecha_crea)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
