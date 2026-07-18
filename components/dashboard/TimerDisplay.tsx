'use client';

/* eslint-disable */
import { useTimer, useCountdown } from '@/contexts/TimerContext';
import { Clock, Square, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useConfirmModal } from '@/hooks/shared';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { useState, useMemo, useCallback, memo } from 'react';

const getTipoInfo = (timer: any) => {
  const tipo = timer.tipoTransaccion || 'servicio';

  if (tipo === 'servicio') {
    return {
      label: 'Servicio',
      color: 'text-indigo-600 dark:text-indigo-300',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/40',
      borderColor: 'border-indigo-100 dark:border-indigo-900/60',
      icon: <Clock className='h-3 w-3 text-indigo-500 dark:text-indigo-300' />
    };
  }

  if (tipo === 'cuenta') {
    return {
      label: 'Cuenta',
      color: 'text-amber-600 dark:text-amber-300',
      bgColor: 'bg-amber-50 dark:bg-amber-950/40',
      borderColor: 'border-amber-100 dark:border-amber-900/60',
      icon: <Clock className='h-3 w-3 text-amber-500 dark:text-amber-300' />
    };
  }

  if (tipo === 'venta') {
    const codigo = (timer.servicioCode || '').toLowerCase();
    if (codigo.includes('champ') || codigo.includes('sham')) {
      return {
        label: 'Venta - Champaña',
        color: 'text-rose-600 dark:text-rose-300',
        bgColor: 'bg-rose-50 dark:bg-rose-950/40',
        borderColor: 'border-rose-100 dark:border-rose-900/60',
        icon: <Clock className='h-3 w-3 text-rose-500 dark:text-rose-300' />
      };
    }
    return {
      label: 'Venta - Tragos',
      color: 'text-emerald-600 dark:text-emerald-300',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
      borderColor: 'border-emerald-100 dark:border-emerald-900/60',
      icon: <Clock className='h-3 w-3 text-emerald-500 dark:text-emerald-300' />
    };
  }

  return {
    label: 'Venta',
    color: 'text-gray-600 dark:text-slate-300',
    bgColor: 'bg-gray-50 dark:bg-slate-900/70',
    borderColor: 'border-gray-100 dark:border-slate-800',
    icon: <Clock className='h-3 w-3 text-gray-500 dark:text-slate-300' />
  };
};

const TimerItem = memo(
  ({
    timer,
    onStop,
    formatTime
  }: {
    timer: any;
    onStop: (timerId: string, roomName: string) => void;
    formatTime: (time: number) => string;
  }) => {
    const tipoInfo = useMemo(() => getTipoInfo(timer), [timer.tipoTransaccion, timer.servicioCode]);
    const remainingTime = useCountdown(timer);

    return (
      <div
        className={`mb-1 flex items-center justify-between rounded border p-1.5 shadow-xs ${tipoInfo.bgColor} ${tipoInfo.borderColor}`}
      >
        <div className='flex-1 min-w-0'>
          <div className='flex flex-col'>
            <span
              className={`truncate text-sm font-bold ${
                timer.isPaused
                  ? 'text-yellow-600 dark:text-yellow-300'
                  : 'text-gray-900 dark:text-slate-100'
              }`}
            >
              {timer.roomName}
            </span>
            <div className='flex items-center gap-1'>
              {tipoInfo.icon}
              <span className={`text-[10px] ${tipoInfo.color} font-bold uppercase tracking-tight`}>
                {tipoInfo.label}
              </span>
            </div>
            {timer.waiterName && (
              <span className='truncate text-[9px] font-medium italic text-gray-500 dark:text-slate-400'>
                Garzón: {timer.waiterName}
              </span>
            )}
          </div>
        </div>
        <div className='flex items-center gap-1.5 ml-1'>
          <div className='flex flex-col items-end'>
            <span
              className={`font-mono text-sm font-black tabular-nums ${
                timer.isPaused
                  ? 'text-yellow-600 dark:text-yellow-300'
                  : remainingTime < 60
                    ? 'animate-pulse text-red-600 dark:text-red-300'
                    : 'text-blue-700 dark:text-blue-300'
              }`}
            >
              {formatTime(remainingTime)}
              {timer.isPaused && <span className='ml-1 text-xs text-yellow-600'>⏸️</span>}
            </span>
          </div>
          {!timer.isPaused && (
            <Button
              size='sm'
              variant='ghost'
              onClick={() => onStop(timer.id, timer.roomName)}
              className='h-6 w-6 p-0 transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/60 dark:hover:text-red-300'
            >
              <Square className='w-3 h-3' />
            </Button>
          )}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.timer.id === nextProps.timer.id &&
      prevProps.timer.isPaused === nextProps.timer.isPaused &&
      prevProps.timer.isActive === nextProps.timer.isActive
    );
  }
);

export function TimerDisplay() {
  const { timers, stopTimer, formatTime } = useTimer();
  const { modalState, showConfirm } = useConfirmModal();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleStopTimer = useCallback(
    async (timerId: string, roomName: string) => {
      const confirmed = await showConfirm({
        title: 'Detener Temporizador',
        message: `¿Estás seguro de que quieres detener el temporizador de ${roomName}?`,
        type: 'question',
        confirmText: 'Sí, Detener',
        cancelText: 'Cancelar',
        size: 'sm'
      });

      if (confirmed) {
        await stopTimer(timerId);
        toast.success(`Temporizador detenido para ${roomName}`);
      }
    },
    [showConfirm, stopTimer]
  );

  const activeTimers = useMemo(() => {
    return timers.filter(t => !t.isPaused);
  }, [timers]);

  if (activeTimers.length === 0) {
    return null;
  }

  if (activeTimers.length === 1) {
    const timer = activeTimers[0];
    return (
      <>
        <div className='fixed bottom-4 right-4 z-50 max-w-xs'>
          <Card className='border border-gray-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950/95 dark:shadow-2xl'>
            <CardHeader className='pb-1'>
              <CardTitle className='flex items-center gap-1 text-xs font-semibold text-slate-900 dark:text-slate-100'>
                <Clock className='text-xs text-blue-600 dark:text-blue-300' />
                Temporizador
              </CardTitle>
            </CardHeader>
            <CardContent className='pt-0'>
              <TimerItem timer={timer} onStop={handleStopTimer} formatTime={formatTime} />
            </CardContent>
          </Card>
        </div>
        <ConfirmModal
          open={modalState.open}
          onOpenChange={open => modalState.onCancel?.()}
          title={modalState.title}
          message={modalState.message}
          confirmText={modalState.confirmText}
          cancelText={modalState.cancelText}
          hideCancel={modalState.hideCancel}
          type={modalState.type}
          onConfirm={modalState.onConfirm || (() => {})}
          onCancel={modalState.onCancel}
          confirmVariant={modalState.confirmVariant}
          cancelVariant={modalState.cancelVariant}
          size={modalState.size}
        />
      </>
    );
  }

  const firstTimer = activeTimers[0];
  const remainingCount = activeTimers.length - 1;

  return (
    <>
      <div className='fixed bottom-4 right-4 z-50 max-w-xs'>
        <Card className='border border-gray-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950/95 dark:shadow-2xl'>
          <CardHeader className='pb-1'>
            <CardTitle className='flex items-center gap-1 text-xs font-semibold text-slate-900 dark:text-slate-100'>
              <Clock className='text-xs text-blue-600 dark:text-blue-300' />
              Temporizadores
              <Badge
                variant='secondary'
                className='ml-auto text-xs dark:bg-slate-800 dark:text-slate-100'
              >
                {activeTimers.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className='pt-0'>
            {}
            <TimerItem timer={firstTimer} onStop={handleStopTimer} formatTime={formatTime} />

            {}
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setIsExpanded(!isExpanded)}
              className='mt-1 h-6 w-full text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
            >
              {isExpanded ? (
                <ChevronUp className='text-xs mr-1' />
              ) : (
                <ChevronDown className='text-xs mr-1' />
              )}
              {isExpanded ? 'Ocultar' : `Mostrar ${remainingCount} más`}
            </Button>

            {}
            {isExpanded && (
              <div className='space-y-1 mt-1 max-h-32 overflow-y-auto'>
                {activeTimers.slice(1).map(timer => (
                  <TimerItem
                    key={timer.id}
                    timer={timer}
                    onStop={handleStopTimer}
                    formatTime={formatTime}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmModal
        open={modalState.open}
        onOpenChange={open => modalState.onCancel?.()}
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        hideCancel={modalState.hideCancel}
        type={modalState.type}
        onConfirm={modalState.onConfirm || (() => {})}
        onCancel={modalState.onCancel}
        confirmVariant={modalState.confirmVariant}
        cancelVariant={modalState.cancelVariant}
        size={modalState.size}
      />
    </>
  );
}
