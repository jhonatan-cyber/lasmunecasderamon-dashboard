/* eslint-disable */
'use client';

import { useServiceTimer } from '@/hooks/servicios/useServiceTimer';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface ServiceTimerTestProps {
  servicioId: number;
  initialTimeMinutes: number;
}

export default function ServiceTimerTest({ servicioId, initialTimeMinutes }: ServiceTimerTestProps) {
  const {
    mainTimer,
    temporaryTimer,
    isTemporaryActive,
    displayTimer,
    pauseMainTimer,
    resumeMainTimer,
    startTemporaryTimer,
    formatTime,
    isPaused
  } = useServiceTimer({
    servicioId,
    initialTime: initialTimeMinutes * 60, // convertir a segundos
    onExpire: () => {
      console.log('Timer principal expirado para servicio:', servicioId);
    }
  });

  const handleStartTemporaryTimer = () => {
    startTemporaryTimer({
      duration: 2, // 2 minutos para prueba
      onComplete: () => {
        console.log('Timer temporal completado para servicio:', servicioId);
      }
    });
  };

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <h3 className="font-semibold">Test Timer - Servicio {servicioId}</h3>
      
      {/* Timer Display */}
      <div className="flex items-center gap-2">
        <Clock className={`w-4 h-4 ${isTemporaryActive ? 'text-blue-500' : isPaused ? 'text-orange-500' : 'text-gray-500'}`} />
        <span className="text-sm">
          {isTemporaryActive ? 'Timer Temporal' : isPaused ? 'Timer Pausado' : 'Timer Principal'}
        </span>
        <span className="font-mono text-lg font-semibold">
          {formatTime(displayTimer.totalSeconds)}
        </span>
      </div>

      {/* Timer Info */}
      <div className="text-xs space-y-1">
        <div>Timer Principal: {formatTime(mainTimer.totalSeconds)} {mainTimer.isPaused ? '(PAUSADO)' : '(ACTIVO)'}</div>
        {temporaryTimer && (
          <div>Timer Temporal: {formatTime(temporaryTimer.totalSeconds)} (ACTIVO)</div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <Button size="sm" onClick={pauseMainTimer} disabled={isTemporaryActive}>
          Pausar Principal
        </Button>
        <Button size="sm" onClick={resumeMainTimer} disabled={isTemporaryActive}>
          Reanudar Principal
        </Button>
        <Button size="sm" onClick={handleStartTemporaryTimer} disabled={isTemporaryActive}>
          Iniciar Temporal (2min)
        </Button>
      </div>
    </div>
  );
}