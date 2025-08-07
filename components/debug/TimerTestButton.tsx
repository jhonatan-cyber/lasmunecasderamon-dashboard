'use client';

import { Button } from '@/components/ui/button';
import { useTimer } from '@/contexts/TimerContext';
import { useState, useEffect } from 'react';

export function TimerTestButton() {
  const { timers, pauseTimerByServicioId, resumeTimerByServicioId } = useTimer();
  const [servicioId, setServicioId] = useState<number>(0);
  const [lastPausedId, setLastPausedId] = useState<number | null>(null);

  // Monitorear cambios en timers cuando se pausa
  useEffect(() => {
    if (lastPausedId) {
      const timer = timers.find(t => t.servicioId === lastPausedId);
      if (timer) {
        console.log(`🧪 PRUEBA: Timer ${lastPausedId} actualizado:`, timer);
        console.log(`🧪 PRUEBA: isPaused = ${timer.isPaused}`);
        if (timer.isPaused) {
          console.log(`✅ PRUEBA: ¡Timer ${lastPausedId} pausado exitosamente!`);
          setLastPausedId(null); // Reset
        }
      }
    }
  }, [timers, lastPausedId]);

  const handlePauseTimer = () => {
    console.log(`🧪 PRUEBA: Intentando pausar timer para servicio ${servicioId}`);
    console.log(
      `🧪 PRUEBA: Timers actuales:`,
      timers.map(t => ({
        servicioId: t.servicioId,
        servicioCode: t.servicioCode,
        isPaused: t.isPaused
      }))
    );

    if (servicioId && timers.some(t => t.servicioId === servicioId)) {
      console.log(`🧪 PRUEBA: Encontrado timer para servicio ${servicioId}, pausando...`);
      setLastPausedId(servicioId); // Marcar para monitorear
      pauseTimerByServicioId(servicioId);
    } else {
      console.log('🧪 PRUEBA: No se encontró timer para el servicio', servicioId);
      console.log(
        '🧪 PRUEBA: Timers disponibles:',
        timers.map(t => ({ servicioId: t.servicioId, servicioCode: t.servicioCode }))
      );
    }
  };

  const handleResumeTimer = () => {
    if (servicioId && timers.some(t => t.servicioId === servicioId)) {
      console.log(`🧪 PRUEBA: Reanudando timer para servicio ${servicioId}`);
      resumeTimerByServicioId(servicioId);
    }
  };

  if (timers.length === 0) {
    return (
      <div className='fixed top-4 right-4 bg-yellow-100 p-2 rounded border'>
        <p className='text-xs'>No hay temporizadores activos</p>
      </div>
    );
  }

  return (
    <div className='fixed top-4 right-4 bg-blue-100 p-3 rounded border'>
      <h3 className='text-sm font-bold mb-2'>🧪 Debug Timer</h3>
      <div className='space-y-2'>
        <input
          type='number'
          placeholder='ID del servicio'
          value={servicioId || ''}
          onChange={e => setServicioId(Number(e.target.value))}
          className='w-full text-xs p-1 border rounded'
        />
        <div className='flex gap-1'>
          <Button size='sm' onClick={handlePauseTimer} className='text-xs'>
            ⏸️ Pausar
          </Button>
          <Button size='sm' onClick={handleResumeTimer} className='text-xs'>
            ▶️ Reanudar
          </Button>
          <Button
            size='sm'
            onClick={() => {
              console.log('🧪 PRUEBA DIRECTA: Pausando timer 19');
              console.log(
                '🧪 PRUEBA DIRECTA: Función pauseTimerByServicioId:',
                pauseTimerByServicioId
              );

              try {
                pauseTimerByServicioId(19);
                console.log('🧪 PRUEBA DIRECTA: Función ejecutada sin errores');
              } catch (error) {
                console.error('🧪 PRUEBA DIRECTA: Error al ejecutar función:', error);
              }
            }}
            className='text-xs bg-red-500 text-white'
          >
            🚨 Pausar 19
          </Button>
          <Button
            size='sm'
            onClick={() => {
              console.log('🧪 PRUEBA SIMPLE: Test de función');
              console.log('🧪 PRUEBA SIMPLE: Timers actuales:', timers);
              console.log(
                '🧪 PRUEBA SIMPLE: Timer 19:',
                timers.find(t => t.servicioId === 20)
              );
            }}
            className='text-xs bg-green-500 text-white'
          >
            🧪 Test
          </Button>
        </div>
        <div className='text-xs'>
          <p>Timers activos: {timers.length}</p>
          {timers.map(t => (
            <p key={t.id}>
              {t.servicioCode}: {t.isPaused ? '⏸️' : '▶️'} {t.remainingTime}s
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
