'use client';

import React from 'react';
import { useTimer } from '@/contexts/TimerContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Square } from 'lucide-react';

export const TimerDisplay: React.FC = () => {
  const { timers, stopTimer, formatTime } = useTimer();

  const handleStopTimer = async (
    timerId: string,
    roomName: string,
    servicioCode: string,
    clienteNombre: string
  ) => {
    const confirmed = confirm(
      `¿Finalizar Servicio?\n\nServicio: ${servicioCode}\nHabitación: ${roomName}\nCliente: ${clienteNombre}\n\nAl finalizar se liberará la habitación y se eliminará el temporizador del almacenamiento local. ¿Deseas continuar?`
    );

    if (confirmed) {
      stopTimer(timerId, true); // Indicar que es una parada manual
    }
  };

  if (timers.length === 0) {
    return null;
  }

  return (
    <div className='fixed bottom-4 right-4 z-50 space-y-1'>
      {timers.map(timer => (
        <Card key={timer.id} className='w-40 bg-white shadow-lg border-l-4 border-orange-500'>
          <CardHeader className='pb-0 pt-1'>
            <CardTitle className='text-xs flex items-center justify-between'>
              <span className='flex items-center gap-1'>
                <Clock className='text-orange-500 text-xs' />
                <span className='truncate text-xs'>{timer.roomName}</span>
              </span>
              <Button
                variant='outline'
                size='sm'
                onClick={async () =>
                  await handleStopTimer(
                    timer.id,
                    timer.roomName,
                    timer.servicioCode,
                    timer.clienteNombre
                  )
                }
                className='h-3 px-1 text-xs'
              >
                <Square className='text-red-500 text-xs' />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className='pt-0 pb-1'>
            <div className='text-center'>
              <div className='text-xs font-bold text-orange-600'>
                {formatTime(timer.remainingTime)}
              </div>
              <div className='text-xs text-gray-500 mt-0'>Tiempo restante</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
