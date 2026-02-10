'use client';

import { useServiceTimer } from '@/hooks/servicios/useServiceTimer';
import { Button } from '@/components/ui/button';

export default function TimerTest() {
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
    servicioId: 999,
    initialTime: 300, // 5 minutos en segundos
    onExpire: () => {
      console.log('Timer expired!');
    },
    autoStart: true
  });

  const handleStartTempTimer = () => {
    startTemporaryTimer({
      duration: 2, // 2 minutos
      onComplete: () => {
        console.log('Temporary timer completed!');
      }
    });
  };

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <h3 className="text-lg font-semibold">Timer Test</h3>
      
      <div className="space-y-2">
        <div className="p-3 bg-gray-50 rounded">
          <strong>Timer que se muestra:</strong> 
          <div className="text-2xl font-mono">
            {formatTime(displayTimer.totalSeconds)}
            {isTemporaryActive && <span className="ml-2 text-blue-600 text-sm">(TEMPORAL)</span>}
            {displayTimer.isPaused && !isTemporaryActive && <span className="ml-2 text-orange-600 text-sm">(PAUSADO)</span>}
          </div>
        </div>
        
        <div className="p-3 bg-blue-50 rounded">
          <strong>Timer Principal:</strong> 
          <div className="text-lg font-mono">
            {formatTime(mainTimer.totalSeconds)}
            <span className="ml-2 text-sm">
              {mainTimer.isPaused ? '⏸️ PAUSADO' : '▶️ ACTIVO'}
            </span>
          </div>
        </div>
        
        {temporaryTimer && (
          <div className="p-3 bg-green-50 rounded">
            <strong>Timer Temporal:</strong> 
            <div className="text-lg font-mono">
              {formatTime(temporaryTimer.totalSeconds)}
              <span className="ml-2 text-blue-600 text-sm">⏱️ TEMPORAL ACTIVO</span>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex gap-2 flex-wrap">
        <Button onClick={pauseMainTimer} disabled={isPaused || isTemporaryActive}>
          Pausar Principal
        </Button>
        <Button onClick={resumeMainTimer} disabled={!isPaused || isTemporaryActive}>
          Reanudar Principal
        </Button>
        <Button onClick={handleStartTempTimer} disabled={isTemporaryActive} className="bg-blue-600">
          Iniciar Temporal (2min)
        </Button>
      </div>
      
      <div className="text-sm text-gray-600 space-y-1">
        <p><strong>Estado actual:</strong> {isTemporaryActive ? 'Timer temporal activo' : 'Timer principal activo'}</p>
        <p><strong>Principal pausado:</strong> {mainTimer.isPaused ? 'Sí' : 'No'}</p>
        <p><strong>Temporal activo:</strong> {isTemporaryActive ? 'Sí' : 'No'}</p>
        <p><strong>Display pausado:</strong> {displayTimer.isPaused ? 'Sí' : 'No'}</p>
      </div>
      
      <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
        <p><strong>Comportamiento esperado:</strong></p>
        <p>1. Timer principal corre normalmente</p>
        <p>2. Al iniciar temporal: principal se pausa y guarda su tiempo</p>
        <p>3. Timer temporal corre y se muestra</p>
        <p>4. Al terminar temporal: principal se reanuda con tiempo guardado</p>
      </div>
    </div>
  );
}