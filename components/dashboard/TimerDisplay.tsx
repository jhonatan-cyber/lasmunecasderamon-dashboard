/* eslint-disable */
import { useTimer, useCountdown } from '@/contexts/TimerContext';
import { Clock, Square, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useConfirmModal } from '@/hooks/shared/useConfirmModal';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { useState, useMemo, useCallback, memo } from 'react';

// Función memoizada para determinar el tipo de transacción y su estilo
const getTipoInfo = (timer: any) => {
  const tipo = timer.tipoTransaccion || 'servicio';
  
  if (tipo === 'servicio') {
    return {
      label: 'Servicio',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-100',
      icon: <Clock className='w-3 h-3 text-indigo-500' />
    };
  }

  if (tipo === 'cuenta') {
    return {
      label: 'Cuenta',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100',
      icon: <Clock className='w-3 h-3 text-amber-500' />
    };
  }

  if (tipo === 'venta') {
    // Para ventas, intentar determinar si es champaña o tragos
    const codigo = (timer.servicioCode || '').toLowerCase();
    if (codigo.includes('champ') || codigo.includes('sham')) {
      return {
        label: 'Venta - Champaña',
        color: 'text-rose-600',
        bgColor: 'bg-rose-50',
        borderColor: 'border-rose-100',
        icon: <Clock className='w-3 h-3 text-rose-500' />
      };
    }
    return {
      label: 'Venta - Tragos',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100',
      icon: <Clock className='w-3 h-3 text-emerald-500' />
    };
  }

  return {
    label: 'Venta',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-100',
    icon: <Clock className='w-3 h-3 text-gray-500' />
  };
};

// Componente memoizado para cada timer individual
const TimerItem = memo(({
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
    <div className={`flex items-center justify-between p-1.5 ${tipoInfo.bgColor} rounded border ${tipoInfo.borderColor} mb-1 shadow-sm`}>
      <div className='flex-1 min-w-0'>
        <div className='flex flex-col'>
          <span
            className={`font-bold text-sm truncate ${timer.isPaused ? 'text-yellow-600' : 'text-gray-900'
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
            <span className='text-[9px] text-gray-500 font-medium truncate italic'>
              Garzón: {timer.waiterName}
            </span>
          )}
        </div>
      </div>
      <div className='flex items-center gap-1.5 ml-1'>
        <div className='flex flex-col items-end'>
          <span
            className={`font-mono text-sm font-black tabular-nums ${timer.isPaused ? 'text-yellow-600' : (remainingTime < 60 ? 'text-red-600 animate-pulse' : 'text-blue-700')
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
            className='h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600 transition-colors'
          >
            <Square className='w-3 h-3' />
          </Button>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Solo re-renderizar si cambian estos valores
  // NOTA: remainingTime ya no se pasa como prop, se maneja internamente con useCountdown
  return (
    prevProps.timer.id === nextProps.timer.id &&
    prevProps.timer.isPaused === nextProps.timer.isPaused &&
    prevProps.timer.isActive === nextProps.timer.isActive
  );
});

export function TimerDisplay() {
  const { timers, stopTimer, formatTime } = useTimer();
  const { modalState, showConfirm } = useConfirmModal();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleStopTimer = useCallback(async (timerId: string, roomName: string) => {
    // Mostrar confirmación con modal personalizado antes de detener
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
  }, [showConfirm, stopTimer]);

  // Filtrar solo timers activos (no pausados)
  const activeTimers = useMemo(() => {
    return timers.filter(t => !t.isPaused);
  }, [timers]);

  if (activeTimers.length === 0) {
    return null; // No mostrar nada si no hay temporizadores activos
  }

  // Si solo hay un timer, mostrarlo directamente
  if (activeTimers.length === 1) {
    const timer = activeTimers[0];
    return (
      <>
        <div className='fixed bottom-4 right-4 z-50 max-w-xs'>
          <Card className='bg-white shadow-lg border border-gray-200'>
            <CardHeader className='pb-1'>
              <CardTitle className='text-xs font-semibold flex items-center gap-1'>
                <Clock className='text-blue-600 text-xs' />
                Temporizador
              </CardTitle>
            </CardHeader>
            <CardContent className='pt-0'>
              <TimerItem
                timer={timer}
                onStop={handleStopTimer}
                formatTime={formatTime}
              />
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
          onConfirm={modalState.onConfirm || (() => { })}
          onCancel={modalState.onCancel}
          confirmVariant={modalState.confirmVariant}
          cancelVariant={modalState.cancelVariant}
          size={modalState.size}
        />
      </>
    );
  }

  // Si hay múltiples timers, mostrar el primero y permitir expandir
  const firstTimer = activeTimers[0];
  const remainingCount = activeTimers.length - 1;

  return (
    <>
      <div className='fixed bottom-4 right-4 z-50 max-w-xs'>
        <Card className='bg-white shadow-lg border border-gray-200'>
          <CardHeader className='pb-1'>
            <CardTitle className='text-xs font-semibold flex items-center gap-1'>
              <Clock className='text-blue-600 text-xs' />
              Temporizadores
              <Badge variant='secondary' className='ml-auto text-xs'>
                {activeTimers.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className='pt-0'>
            {/* Timer principal (siempre visible) */}
            <TimerItem
              timer={firstTimer}
              onStop={handleStopTimer}
              formatTime={formatTime}
            />

            {/* Botón para expandir/contraer */}
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setIsExpanded(!isExpanded)}
              className='w-full mt-1 h-6 text-xs'
            >
              {isExpanded ? (
                <ChevronUp className='text-xs mr-1' />
              ) : (
                <ChevronDown className='text-xs mr-1' />
              )}
              {isExpanded ? 'Ocultar' : `Mostrar ${remainingCount} más`}
            </Button>

            {/* Timers adicionales (solo visibles cuando está expandido) */}
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
        onConfirm={modalState.onConfirm || (() => { })}
        onCancel={modalState.onCancel}
        confirmVariant={modalState.confirmVariant}
        cancelVariant={modalState.cancelVariant}
        size={modalState.size}
      />
    </>
  );
}

