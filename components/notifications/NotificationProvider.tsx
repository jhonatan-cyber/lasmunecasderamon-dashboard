'use client';

import { useNotifications } from '@/hooks/useNotifications';
import { useRef, useEffect, useState } from 'react';

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const hasInitialized = useRef(false);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    if (!hasInitialized.current) {
      hasInitialized.current = true;
    }
  }, []);

  // Siempre llamar el hook, pero el hook maneja internamente si debe conectarse
  useNotifications();

  // Este componente no renderiza nada, solo maneja las notificaciones
  return <>{children}</>;
} 