'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, User, Home, CreditCard, Square, Users, ShoppingBag, Eye } from 'lucide-react';
import { VentaWithDetails } from '@/types/venta';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { useTimer, useCountdown } from '@/contexts/TimerContext';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';

interface SaleCardProps {
  venta: VentaWithDetails;
  onRefresh?: () => void;
  onVerDetalles?: (ventaId: string | number) => void;
}

export default function SaleCard({ venta, onRefresh, onVerDetalles }: SaleCardProps) {
  const { getTimerByServicioId, formatTime, stopTimerByServicioId, timers } = useTimer();
  const [stopping, setStopping] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { user } = useCurrentUser();
  const isAdminOrCajero =
    user?.role?.toLowerCase() === 'administrador' || user?.role?.toLowerCase() === 'cajero';

  const timer = getTimerByServicioId(String(venta.id));

  const remainingTime = useCountdown(timer);

  useEffect(() => {}, [timers]);

  const confirmStopTimer = async () => {
    setStopping(true);
    try {
      await stopTimerByServicioId(String(venta.id));

      toast.success('Temporizador finalizado exitosamente');
      setShowConfirm(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Error al finalizar el temporizador');
    } finally {
      setStopping(false);
    }
  };

  const isLowTime = isAdminOrCajero && timer && timer.isActive && remainingTime <= 300;

  const hostesses = Array.from(
    new Set(
      (venta.usuarios?.map(u => u.nick || u.usuario_nombre).filter(Boolean) ||
        venta.anfitrionas_nicks
          ?.split(',')
          .map(nick => nick.trim())
          .filter(Boolean) ||
        []) as string[]
    )
  );

  const handleCardClick = () => {
    if (onVerDetalles) {
      onVerDetalles(venta.id);
    }
  };

  return (
    <Card
      className={`w-full transition-all duration-200 hover:shadow-md cursor-pointer ${isLowTime ? 'border-red-200 bg-red-50/30 dark:border-red-800 dark:bg-red-950/20' : ''}`}
      onClick={handleCardClick}
    >
      <div className='p-4 space-y-4'>
        {}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='flex items-center gap-2'>
              <Home className='w-4 h-4 text-gray-600 dark:text-gray-400' />
              <span className='font-semibold text-md text-gray-900 dark:text-neutral-100'>
                {venta.habitacion_numero || venta.habitacion_nombre || timer?.roomName || 'S/H'}
              </span>
            </div>
            <Badge
              variant='secondary'
              className='text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
            >
              Venta
            </Badge>
          </div>
          <span className='text-xs text-gray-500 dark:text-gray-400 font-mono'>
            #{venta.codigo}
          </span>
        </div>

        {}
        {isAdminOrCajero && (
          <div className='bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Clock
                  className={`w-4 h-4 ${isLowTime ? 'text-red-500 animate-pulse' : 'text-gray-500 dark:text-gray-400'}`}
                />
                <span className='text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tight'>
                  Tiempo restante
                </span>
              </div>
              <div className='text-right'>
                <span
                  className={`font-mono text-xl font-bold ${isLowTime ? 'text-red-600 dark:text-red-500' : 'text-gray-900 dark:text-gray-100'}`}
                >
                  {timer ? formatTime(remainingTime) : '00:00'}
                </span>
              </div>
            </div>

            <div className='grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60'>
              <div className='flex flex-col'>
                <span className='text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase'>
                  Ingreso
                </span>
                <span className='text-xs font-medium text-gray-700 dark:text-gray-300'>
                  {(() => {
                    const date = new Date((venta.fecha_crea || '').replace(' ', 'T'));
                    return isNaN(date.getTime())
                      ? '-'
                      : `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                  })()}
                </span>
              </div>
              <div className='flex flex-col'>
                <span className='text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase'>
                  Salida
                </span>
                <span className='text-xs font-bold text-blue-600 dark:text-blue-400'>
                  {(() => {
                    const entry = new Date((venta.fecha_crea || '').replace(' ', 'T'));
                    if (isNaN(entry.getTime())) return '-';
                    const exit = new Date(entry.getTime() + (venta.tiempo || 60) * 60000);
                    return `${String(exit.getHours()).padStart(2, '0')}:${String(exit.getMinutes()).padStart(2, '0')}`;
                  })()}
                </span>
              </div>
              <div className='flex flex-col items-end'>
                <span className='text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase'>
                  Uso
                </span>
                <span className='text-xs font-medium text-gray-700 dark:text-gray-300'>
                  {venta.tiempo || 60} min
                </span>
              </div>
            </div>
          </div>
        )}

        {}
        <div className='space-y-3'>
          {}
          <div className='flex items-center gap-2'>
            <User className='w-4 h-4 text-blue-500 flex-shrink-0' />
            <div className='min-w-0'>
              <span className='text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider block font-bold'>
                Cliente
              </span>
              <span className='text-sm font-medium truncate block text-gray-900 dark:text-neutral-100'>
                {venta.cliente_nombre?.toLowerCase() === 'sin cliente' || !venta.cliente_nombre
                  ? 'sin cliente registrado'
                  : venta.cliente_nombre}
              </span>
            </div>
          </div>

          {}
          <div className='flex items-start gap-2'>
            <Users className='w-4 h-4 text-purple-500 flex-shrink-0 mt-1' />
            <div className='min-w-0 flex-1'>
              <span className='text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider block font-bold'>
                Anfitrionas
              </span>
              <div className='flex flex-wrap gap-1 mt-1'>
                {hostesses.length > 0 ? (
                  hostesses.map((nick, idx) => (
                    <Badge
                      key={idx}
                      variant='outline'
                      className='text-[10px] bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
                    >
                      {nick}
                    </Badge>
                  ))
                ) : (
                  <span className='text-xs text-gray-400 dark:text-gray-500 italic'>
                    Sin anfitrionas
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {}
        {(venta.garzon_nombre || timer?.waiterName) && (
          <div className='flex items-center gap-2 text-sm'>
            <User className='w-4 h-4 text-green-600 flex-shrink-0' />
            <div className='min-w-0'>
              <span className='text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider block font-bold'>
                Garzón / Mesero
              </span>
              <span className='text-sm font-medium truncate block text-gray-900 dark:text-neutral-100'>
                {venta.garzon_nombre || timer?.waiterName}
              </span>
            </div>
          </div>
        )}

        {}
        <div className='flex items-center justify-between pt-3 border-t border-gray-200 dark:border-neutral-800'>
          <div className='flex flex-col'>
            <span className='text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-bold'>
              Total Venta
            </span>
            <span className='font-bold text-gray-900 dark:text-neutral-100 text-lg'>
              {formatCurrencyNoDecimals(venta.total)}
            </span>
          </div>
          <div className='text-right'>
            <div className='flex items-center justify-end gap-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-neutral-800 px-2 py-1 rounded-full'>
              <CreditCard className='w-3 h-3' />
              <span className='capitalize'>{venta.metodo_pago}</span>
            </div>
          </div>
        </div>

        {}
        <div className='flex items-center justify-end pt-2 gap-2'>
          {onVerDetalles && (
            <Button
              size='sm'
              variant='outline'
              onClick={e => {
                e.stopPropagation();
                onVerDetalles(venta.id);
              }}
              className='flex-1 rounded-full'
            >
              <Eye className='w-3 h-3 mr-1' />
              Ver detalles
            </Button>
          )}
          {timer && timer.isActive && (
            <Button
              size='sm'
              variant='default'
              onClick={e => {
                e.stopPropagation();
                setShowConfirm(true);
              }}
              className='bg-blue-600 hover:bg-blue-700 text-white rounded-full'
            >
              <Square className='w-3 h-3 mr-1' />
              Finalizar
            </Button>
          )}
        </div>
      </div>

      {showConfirm && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4'>
          <div className='bg-white dark:bg-neutral-900 rounded-lg shadow-xl p-6 max-w-sm w-full font-sans'>
            <div className='text-center'>
              <Clock className='w-12 h-12 text-blue-500 mx-auto mb-4' />
              <h3 className='text-lg font-semibold mb-2 text-gray-900 dark:text-neutral-100'>
                ¿Finalizar temporizador?
              </h3>
              <p className='text-sm text-gray-600 dark:text-gray-400 mb-6'>
                Se detendrá el contador de esta venta. La habitación será liberada y el temporizador
                se quitará del almacenamiento local.
              </p>
              <div className='flex gap-3'>
                <Button
                  variant='outline'
                  className='flex-1 rounded-full'
                  onClick={() => setShowConfirm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className='flex-1 bg-blue-600 hover:bg-blue-700 rounded-full text-white'
                  onClick={confirmStopTimer}
                  disabled={stopping}
                >
                  {stopping ? 'Finalizando...' : 'Finalizar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
