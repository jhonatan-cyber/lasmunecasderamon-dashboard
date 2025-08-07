'use client';

import { useNotifications } from '@/hooks/useNotifications';
import { useRef, useEffect } from 'react';

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const hasInitialized = useRef(false);
  
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
    }
  }, []);

  // Usar el hook de notificaciones - el hook maneja internamente la lógica de conexión
  useNotifications();

  // Este componente no renderiza nada, solo maneja las notificaciones
  return <>{children}</>;
} 