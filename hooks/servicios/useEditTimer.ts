'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface EditTimerOptions {
  duration: number; 
  onComplete?: () => void;
  onTick?: (remainingTime: number) => void;
}

export const useEditTimer = () => {
  const [isActive, setIsActive] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  const onCompleteRef = useRef<(() => void) | null>(null);
  const onTickRef = useRef<((time: number) => void) | null>(null);

  const startEditTimer = useCallback((options: EditTimerOptions) => {
    setRemainingTime(options.duration);
    setIsActive(true);
    onCompleteRef.current = options.onComplete || null;
    onTickRef.current = options.onTick || null;
  }, []);

  const stopEditTimer = useCallback(() => {
    setIsActive(false);
    setRemainingTime(0);
    onCompleteRef.current = null;
    onTickRef.current = null;
  }, []);

  const pauseEditTimer = useCallback(() => {
    setIsActive(false);
  }, []);

  const resumeEditTimer = useCallback(() => {
    if (remainingTime > 0) {
      setIsActive(true);
    }
  }, [remainingTime]);

  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    if (!isActive || remainingTime <= 0) return;

    const interval = setInterval(() => {
      setRemainingTime(prev => {
        const newTime = prev - 1;
        if (onTickRef.current) {
          onTickRef.current(newTime);
        }

        if (newTime <= 0) {
          setIsActive(false);
          if (onCompleteRef.current) {
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