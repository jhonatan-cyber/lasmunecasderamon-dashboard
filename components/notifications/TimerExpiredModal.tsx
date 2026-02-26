'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, Home, User, Users, ShoppingBag } from 'lucide-react';
import { formatSoloHora } from '@/lib/formatters';

interface TimerExpiredModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomName: string;
  servicioCode: string;
  clienteNombre: string;
  tiempoTotal: number; // en minutos
  isTemporary?: boolean;
  tipoTransaccion?: 'servicio' | 'venta';
  anfitrionas?: string;
}

export default function TimerExpiredModal({
  open,
  onOpenChange,
  roomName,
  servicioCode,
  clienteNombre,
  tiempoTotal,
  isTemporary = false,
  tipoTransaccion = 'servicio',
  anfitrionas = ''
}: TimerExpiredModalProps) {
  // Debug: mostrar información recibida
  console.log('🔔 TimerExpiredModal - Información recibida:', {
    roomName,
    servicioCode,
    clienteNombre,
    tiempoTotal,
    isTemporary,
    tipoTransaccion,
    anfitrionas
  });

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => { }} modal={true}>
      <DialogContent
        className='timer-expired-modal w-[95vw] max-w-md mx-auto p-0 bg-white dark:bg-gray-800 border-2 border-red-200 dark:border-red-800 flex flex-col max-h-[90vh]'
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        {/* DialogTitle para accesibilidad */}
        <DialogTitle className='sr-only'>
          {isTemporary ? 'Timer temporal finalizado' : `Tiempo de ${tipoTransaccion} terminado`}
        </DialogTitle>

        {/* Header (Fijo) */}
        <div className='bg-gradient-to-r from-red-500 to-red-600 text-white p-4 flex-shrink-0'>
          <div className='flex items-center justify-center gap-3'>
            <Clock className='w-8 h-8' />
            <div className='text-center'>
              <h2 className='text-xl font-bold'>¡Tiempo Terminado!</h2>
              <p className='text-red-100 text-sm'>
                {isTemporary
                  ? 'Timer temporal finalizado'
                  : `${tipoTransaccion === 'servicio' ? 'Servicio' : 'Venta'} completado`}
              </p>
            </div>
          </div>
        </div>

        {/* Contenido (Scrollable) */}
        <div className='flex-1 overflow-y-auto p-6 space-y-4'>
          {/* Información del servicio */}
          <div className='bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3'>
            <div className='flex items-center gap-3'>
              <Home className='w-5 h-5 text-blue-500' />
              <div>
                <p className='text-sm text-gray-600 dark:text-gray-400'>Habitación</p>
                <p className='font-semibold text-lg text-gray-900 dark:text-gray-100'>{roomName}</p>
              </div>
            </div>

            <div className='flex items-center gap-3'>
              <User className='w-5 h-5 text-green-500' />
              <div>
                <p className='text-sm text-gray-600 dark:text-gray-400'>Cliente</p>
                <p className='font-medium text-gray-900 dark:text-gray-100'>{clienteNombre}</p>
              </div>
            </div>

            {/* Tipo de transacción */}
            <div className='flex items-center gap-3'>
              {tipoTransaccion === 'servicio' ? (
                <Home className='w-5 h-5 text-indigo-500' />
              ) : (
                <ShoppingBag className='w-5 h-5 text-orange-500' />
              )}
              <div>
                <p className='text-sm text-gray-600 dark:text-gray-400'>Tipo</p>
                <p className='font-medium text-gray-900 dark:text-gray-100 capitalize'>
                  {tipoTransaccion === 'servicio' ? 'Servicio' : 'Venta'}
                </p>
              </div>
            </div>

            {/* Anfitrionas */}
            {anfitrionas && anfitrionas.trim() !== '' && (
              <div className='flex items-start gap-3'>
                <Users className='w-5 h-5 text-pink-500 mt-0.5' />
                <div className='flex-1'>
                  <p className='text-sm text-gray-600 dark:text-gray-400 font-medium'>
                    Anfitriona(s)
                  </p>
                  <div className='flex flex-wrap gap-1.5 mt-1.5'>
                    {anfitrionas.split(',').map((anfitriona, index) => {
                      const name = anfitriona.trim();
                      if (!name) return null;
                      return (
                        <span
                          key={index}
                          className='text-xs font-semibold bg-pink-50 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300 px-2.5 py-1 rounded-full border border-pink-100 dark:border-pink-800 shadow-sm'
                        >
                          {name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className='flex items-center gap-3'>
              <Clock className='w-5 h-5 text-purple-500' />
              <div>
                <p className='text-sm text-gray-600 dark:text-gray-400'>Duración del servicio</p>
                <p className='font-medium text-gray-900 dark:text-gray-100'>
                  {tiempoTotal} minutos
                </p>
              </div>
            </div>

            <div className='border-t pt-3 mt-3'>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-gray-600 dark:text-gray-400'>
                  Código de servicio:
                </span>
                <span className='font-mono font-medium text-gray-900 dark:text-gray-100'>
                  #{servicioCode}
                </span>
              </div>
              <div className='flex items-center justify-between mt-1'>
                <span className='text-sm text-gray-600 dark:text-gray-400'>
                  Hora de finalización:
                </span>
                <span className='font-medium text-gray-900 dark:text-gray-100'>
                  {formatSoloHora(new Date().toISOString())}
                </span>
              </div>
            </div>
          </div>

          {/* Mensaje de estado */}
          <div
            className={`text-center p-3 rounded-lg ${isTemporary
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
              }`}
          >
            <p className='font-medium'>
              {isTemporary
                ? 'Timer temporal finalizado - Volviendo al servicio principal'
                : `${tipoTransaccion === 'servicio' ? 'Servicio' : 'Venta'} finalizado - Habitación liberada automáticamente`}
            </p>
          </div>
        </div>

        {/* Footer (Fijo) */}
        <div className='p-4 border-t flex justify-center flex-shrink-0'>
          <Button
            className='px-8 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium w-full sm:w-auto'
            onClick={handleClose}
          >
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
