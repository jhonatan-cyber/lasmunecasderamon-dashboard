'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useNotifications } from '@/hooks/notificaciones/useNotifications';

interface NotificationsContextType {
  isConnected: boolean;
  lastNotification: any;
  pendingOrdersCount: number;
  pendingServiceRequestsCount: number;
  reconnect: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const notifications = useNotifications();

  // Memoizar el valor del contexto
  const contextValue = useMemo(() => notifications, [
    notifications.isConnected,
    notifications.lastNotification,
    notifications.pendingOrdersCount,
    notifications.pendingServiceRequestsCount,
    notifications.reconnect
  ]);

  return (
    <NotificationsContext.Provider value={contextValue}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotificationsContext debe ser usado dentro de NotificationsProvider');
  }
  return context;
}
