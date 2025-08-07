'use client';

import { useTimer } from '@/contexts/TimerContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faStop, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useState } from 'react';

export function TimerDisplay() {
  const { timers, stopTimer, formatTime } = useTimer();
  const { modalState, showConfirm } = useConfirmModal();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleStopTimer = async (timerId: string, roomName: string) => {
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
  };

    if (timers.length === 0) {
    return null; // No mostrar nada si no hay temporizadores activos
  }

  // Si solo hay un timer, mostrarlo directamente
  if (timers.length === 1) {
    const timer = timers[0];
    return (
      <>
        <div className='fixed bottom-4 right-4 z-50 max-w-xs'>
          <Card className='bg-white shadow-lg border border-gray-200'>
            <CardHeader className='pb-1'>
              <CardTitle className='text-xs font-semibold flex items-center gap-1'>
                <FontAwesomeIcon icon={faClock} className='text-blue-600 text-xs' />
                Temporizador
                {timer.isPaused && (
                  <Badge variant='outline' className='text-yellow-600 border-yellow-600 text-xs'>
                    Pausado
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className='pt-0'>
              <div className='flex items-center justify-between p-1 bg-gray-50 rounded border'>
                <div className='flex-1 min-w-0'>
                  <span className={`font-medium text-xs truncate ${
                    timer.isPaused ? 'text-yellow-600' : ''
                  }`}>
                    {timer.roomName}
                  </span>
                </div>
                <div className='flex items-center gap-1 ml-1'>
                  <span className={`font-mono text-xs font-bold ${
                    timer.isPaused ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {formatTime(timer.remainingTime)}
                    {timer.isPaused && (
                      <span className='ml-1 text-xs text-yellow-600'>⏸️</span>
                    )}
                  </span>
                  {!timer.isPaused && (
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => handleStopTimer(timer.id, timer.roomName)}
                      className='h-5 w-5 p-0'
                    >
                      <FontAwesomeIcon icon={faStop} className='text-xs' />
                    </Button>
                  )}
                </div>
              </div>
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

  // Si hay múltiples timers, mostrar el primero y permitir expandir
  const firstTimer = timers[0];
  const remainingCount = timers.length - 1;

  return (
    <>
      <div className='fixed bottom-4 right-4 z-50 max-w-xs'>
        <Card className='bg-white shadow-lg border border-gray-200'>
          <CardHeader className='pb-1'>
            <CardTitle className='text-xs font-semibold flex items-center gap-1'>
              <FontAwesomeIcon icon={faClock} className='text-blue-600 text-xs' />
              Temporizadores
              <Badge variant='secondary' className='ml-auto text-xs'>
                {timers.length}
              </Badge>
              {timers.some(t => t.isPaused) && (
                <Badge variant='outline' className='text-yellow-600 border-yellow-600 text-xs'>
                  {timers.filter(t => t.isPaused).length} Pausado{timers.filter(t => t.isPaused).length !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className='pt-0'>
            {/* Timer principal (siempre visible) */}
            <div className='flex items-center justify-between p-1 bg-gray-50 rounded border'>
              <div className='flex-1 min-w-0'>
                <span className={`font-medium text-xs truncate ${
                  firstTimer.isPaused ? 'text-yellow-600' : ''
                }`}>
                  {firstTimer.roomName}
                </span>
              </div>
              <div className='flex items-center gap-1 ml-1'>
                <span className={`font-mono text-xs font-bold ${
                  firstTimer.isPaused ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {formatTime(firstTimer.remainingTime)}
                  {firstTimer.isPaused && (
                    <span className='ml-1 text-xs text-yellow-600'>⏸️</span>
                  )}
                </span>
                {!firstTimer.isPaused && (
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => handleStopTimer(firstTimer.id, firstTimer.roomName)}
                    className='h-5 w-5 p-0'
                  >
                    <FontAwesomeIcon icon={faStop} className='text-xs' />
                  </Button>
                )}
              </div>
            </div>

            {/* Botón para expandir/contraer */}
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setIsExpanded(!isExpanded)}
              className='w-full mt-1 h-6 text-xs'
            >
              <FontAwesomeIcon 
                icon={isExpanded ? faChevronUp : faChevronDown} 
                className='text-xs mr-1' 
              />
              {isExpanded ? 'Ocultar' : `Mostrar ${remainingCount} más`}
            </Button>

            {/* Timers adicionales (solo visibles cuando está expandido) */}
            {isExpanded && (
              <div className='space-y-1 mt-1 max-h-32 overflow-y-auto'>
                {timers.slice(1).map(timer => (
                  <div
                    key={timer.id}
                    className='flex items-center justify-between p-1 bg-gray-50 rounded border'
                  >
                    <div className='flex-1 min-w-0'>
                      <span className={`font-medium text-xs truncate ${
                        timer.isPaused ? 'text-yellow-600' : ''
                      }`}>
                        {timer.roomName}
                      </span>
                    </div>
                    <div className='flex items-center gap-1 ml-1'>
                      <span className={`font-mono text-xs font-bold ${
                        timer.isPaused ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {formatTime(timer.remainingTime)}
                        {timer.isPaused && (
                          <span className='ml-1 text-xs text-yellow-600'>⏸️</span>
                        )}
                      </span>
                      {!timer.isPaused && (
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => handleStopTimer(timer.id, timer.roomName)}
                          className='h-5 w-5 p-0'
                        >
                          <FontAwesomeIcon icon={faStop} className='text-xs' />
                        </Button>
                      )}
                    </div>
                  </div>
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
