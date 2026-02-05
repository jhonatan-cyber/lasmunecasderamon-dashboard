'use client';

import { useNotificationsContext } from '@/contexts/NotificationsContext';
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

  // Usar el contexto de notificaciones (que ya inicializa el hook)
  useNotificationsContext();

  // Este componente no renderiza nada, solo maneja las notificaciones
  return <>{children}</>;
} 