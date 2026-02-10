'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface EditTimerOptions {
  duration: number; // en segundos
  onComplete?: () => void;
  onTick?: (remainingTime: number) => void;
}

export const useEditTimer = () => {
  const [isActive, setIsActive] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  
  // Usar refs para evitar recrear callbacks en cada render
  const onCompleteRef = useRef<(() => void) | null>(null);
  const onTickRef = useRef<((time: number) => void) | null>(null);

  // Función para iniciar el temporizador de edición
  const startEditTimer = useCallback((options: EditTimerOptions) => {
    setRemainingTime(options.duration);
    setIsActive(true);
    onCompleteRef.current = options.onComplete || null;
    onTickRef.current = options.onTick || null;
  }, []);

  // Función para detener el temporizador de edición
  const stopEditTimer = useCallback(() => {
    setIsActive(false);
    setRemainingTime(0);
    onCompleteRef.current = null;
    onTickRef.current = null;
  }, []);

  // Función para pausar el temporizador de edición
  const pauseEditTimer = useCallback(() => {
    setIsActive(false);
  }, []);

  // Función para reanudar el temporizador de edición
  const resumeEditTimer = useCallback(() => {
    if (remainingTime > 0) {
      setIsActive(true);
    }
  }, [remainingTime]);

  // Función para formatear el tiempo
  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Efecto para el conteo regresivo
  useEffect(() => {
    if (!isActive || remainingTime <= 0) return;

    const interval = setInterval(() => {
      setRemainingTime(prev => {
        const newTime = prev - 1;
        
        // Llamar callback de tick si existe
        if (onTickRef.current) {
          onTickRef.current(newTime);
        }

        // Si llegó a cero, ejecutar callback de completado
        if (newTime <= 0) {
          setIsActive(false);
          if (onCompleteRef.current) {
            // Usar setTimeout para evitar actualizaciones durante el render
            setTimeout(() => {
              if (onCompleteRef.current) {
                onCompleteRef.current();
              }
            }, 0);
          }
          return 0;
        }

        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, remainingTime]);

  return {
    isActive,
    remainingTime,
    startEditTimer,
    stopEditTimer,
    pauseEditTimer,
    resumeEditTimer,
    formatTime
  };
};