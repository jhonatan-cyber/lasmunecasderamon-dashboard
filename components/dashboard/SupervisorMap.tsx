'use client';

import React, { useMemo } from 'react';
import useRooms from '@/hooks/habitaciones/useRooms';
import { useTimer, calculateRemainingTime } from '@/contexts/TimerContext';
import { Bed, Map as MapIcon, Clock, Pause, Play, AlertTriangle, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const SupervisorMap: React.FC = () => {
  const { filteredRooms, isLoading } = useRooms();
  const { timers, serverOffset } = useTimer();

  const [tick, setTick] = React.useState(0);

  // Intervalo para actualizar el contador localmente cada segundo
  React.useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const roomsWithTimers = useMemo(() => {
    return filteredRooms
      .map(room => {
        const activeTimer = timers.find(t => t.roomId === room.id && t.isActive);
        const remaining = activeTimer ? calculateRemainingTime(activeTimer, serverOffset) : 0;
        return {
          ...room,
          timer: activeTimer,
          remainingTime: remaining
        };
      })
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  }, [filteredRooms, timers, serverOffset, tick]);

  if (isLoading) {
    return (
      <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'>
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className='aspect-square bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl'
          />
        ))}
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.max(0, Math.floor(seconds / 60));
    const secs = Math.max(0, Math.floor(seconds % 60));
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <MapIcon className='w-6 h-6 text-primary' />
          <h2 className='text-xl font-bold'>Mapa de Habitaciones</h2>
        </div>
        <div className='flex gap-4'>
          <div className='flex items-center gap-1.5'>
            <div className='w-3 h-3 rounded-full bg-emerald-500' />
            <span className='text-sm font-medium'>Libre</span>
          </div>
          <div className='flex items-center gap-1.5'>
            <div className='w-3 h-3 rounded-full bg-blue-500' />
            <span className='text-sm font-medium'>Ocupada</span>
          </div>
          <div className='flex items-center gap-1.5'>
            <div className='w-3 h-3 rounded-full bg-orange-500 animate-pulse' />
            <span className='text-sm font-medium'>Pausada</span>
          </div>
          <div className='flex items-center gap-1.5'>
            <div className='w-3 h-3 rounded-full bg-red-500 animate-pulse' />
            <span className='text-sm font-medium'>Crítica</span>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6'>
        {roomsWithTimers.map(room => {
          const isActive = room.timer && room.timer.isActive;
          const isPaused = room.timer && room.timer.isPaused;
          const isCritical = room.remainingTime <= 60 && isActive && !isPaused;
          const isNearEnd = room.remainingTime <= 300 && isActive && !isPaused;

          let colorClass = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800';
          let glowClass = '';
          let iconColor = 'text-slate-400';

          if (isActive) {
            if (isPaused) {
              colorClass =
                'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800';
              iconColor = 'text-orange-500';
            } else if (isCritical) {
              colorClass = 'bg-red-50 dark:bg-red-900/10 border-red-500 animate-pulse-red';
              glowClass = 'shadow-lg shadow-red-200/50 dark:shadow-red-900/20';
              iconColor = 'text-red-600';
            } else if (isNearEnd) {
              colorClass =
                'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-400 animate-pulse-yellow';
              glowClass = 'shadow-md shadow-yellow-100/50 dark:shadow-yellow-900/10';
              iconColor = 'text-yellow-600';
            } else {
              colorClass = 'bg-blue-50 dark:bg-blue-900/10 border-blue-500';
              iconColor = 'text-blue-500';
            }
          } else if (room.status === 1) {
            // Assuming 1 is free
            colorClass =
              'bg-emerald-50/30 dark:bg-emerald-900/5 border-emerald-200 dark:border-emerald-800';
            iconColor = 'text-emerald-500/50';
          }

          return (
            <Card
              key={room.id}
              className={`relative aspect-square flex flex-col items-center justify-center p-4 transition-all duration-300 ${colorClass} ${glowClass} border-2 overflow-hidden group hover:scale-[1.02]`}
            >
              {/* Background Decoration */}
              <div className='absolute top-0 right-0 p-2 opacity-5 pointer-events-none'>
                <Bed className='w-20 h-20 -rotate-12 translate-x-4 -translate-y-4' />
              </div>

              <span
                className={`text-2xl font-black mb-1 ${isActive ? iconColor : 'text-slate-500'}`}
              >
                {room.name}
              </span>

              {isActive ? (
                <div className='flex flex-col items-center gap-1 mt-1'>
                  <div className='flex items-center gap-1.5'>
                    {isPaused ? (
                      <Pause className='w-4 h-4 text-orange-500' />
                    ) : (
                      <Clock className={`w-4 h-4 ${isCritical ? 'animate-bounce' : ''}`} />
                    )}
                    <span
                      className={`text-xl font-mono font-bold ${isCritical ? 'text-red-600' : isNearEnd ? 'text-yellow-600' : isPaused ? 'text-orange-600' : 'text-blue-600'}`}
                    >
                      {formatTime(room.remainingTime)}
                    </span>
                  </div>
                  {isPaused && (
                    <Badge
                      variant='outline'
                      className='text-[10px] bg-white/50 dark:bg-black/50 border-orange-200 text-orange-700'
                    >
                      PAUSADA
                    </Badge>
                  )}
                  {room.timer?.isTemporary && (
                    <Badge
                      variant='outline'
                      className='text-[10px] bg-blue-100 text-blue-800 border-blue-200'
                    >
                      TEMPORAL
                    </Badge>
                  )}
                </div>
              ) : (
                <Badge
                  variant='secondary'
                  className={`mt-2 ${room.status === 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}
                >
                  {room.status === 1 ? 'LIBRE' : 'INACTIVA'}
                </Badge>
              )}

              {/* Hover overlay for quick view */}
              <div className='absolute inset-0 bg-primary/90 hidden group-hover:flex flex-col items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100 duration-300'>
                <p className='text-xs font-medium uppercase tracking-wider mb-2'>
                  Habitación {room.name}
                </p>
                <Button
                  size='sm'
                  variant='secondary'
                  className='rounded-full shadow-lg'
                  onClick={() => (window.location.href = `/rooms?id=${room.id}`)}
                >
                  <ExternalLink className='w-3 h-3 mr-1.5' />
                  Ver Detalle
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
