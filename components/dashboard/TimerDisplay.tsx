/* eslint-disable */
import { useTimer, useCountdown } from '@/contexts/TimerContext';
import { Clock, Square, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useConfirmModal } from '@/hooks/shared/useConfirmModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useState, useMemo, useCallback, memo } from 'react';

// Función memoizada para determinar el tipo de transacción
const getTipoTransaccionLabel = (timer: any): string => {
  if (timer.tipoTransaccion === 'servicio') {
    return 'Servicio';
  }

  // Para ventas, intentar determinar si es champaña o tragos
  if (timer.tipoTransaccion === 'venta') {
    // Si el código contiene información sobre champaña
    const codigo = (timer.servicioCode || '').toLowerCase();
    if (codigo.includes('champ') || codigo.includes('sham')) {
      return 'Venta - Champaña';
    }
    // Por defecto, asumir que es venta de tragos
    return 'Venta - Tragos';
  }

  return 'Venta';
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
  const tipoLabel = useMemo(() => getTipoTransaccionLabel(timer), [timer.tipoTransaccion, timer.servicioCode]);
  const remainingTime = useCountdown(timer);

  return (
    <div className='flex items-center justify-between p-1 bg-gray-50 rounded border'>
      <div className='flex-1 min-w-0'>
        <div className='flex flex-col'>
          <span
            className={`font-semibold text-sm truncate ${timer.isPaused ? 'text-yellow-600' : 'text-gray-900'
              }`}
          >
            Privado: {timer.roomName}
          </span>
          <span className='text-[9px] text-green-600 font-medium'>
            {tipoLabel}
          </span>
          {timer.waiterName && (
            <span className='text-[9px] text-purple-600 font-medium truncate'>
              Garzón: {timer.waiterName}
            </span>
          )}
        </div>
      </div>
      <div className='flex items-center gap-1 ml-1'>
        <span
          className={`font-mono text-xs font-bold ${timer.isPaused ? 'text-yellow-600' : 'text-red-600'
            }`}
        >
          {formatTime(remainingTime)}
          {timer.isPaused && <span className='ml-1 text-xs text-yellow-600'>⏸️</span>}
        </span>
        {!timer.isPaused && (
          <Button
            size='sm'
            variant='outline'
            onClick={() => onStop(timer.id, timer.roomName)}
            className='h-5 w-5 p-0'
          >
            <Square className='text-xs' />
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

