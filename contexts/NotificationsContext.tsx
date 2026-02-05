'use client';

import React, { createContext, useContext } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationsContextType {
  isConnected: boolean;
  connectionAttempts: number;
  lastNotification: any;
  pendingOrdersCount: number;
  pendingServiceRequestsCount: number;
  reconnect: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const notifications = useNotifications();
  
  console.log('[NotificationsProvider] Valor actual:', {
    pendingOrdersCount: notifications.pendingOrdersCount,
    pendingServiceRequestsCount: notifications.pendingServiceRequestsCount
  });

  return (
    <NotificationsContext.Provider value={notifications}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotificationsContext debe ser usado dentro de NotificationsProvider');
  }
  console.log('[useNotificationsContext] Retornando:', {
    pendingOrdersCount: context.pendingOrdersCount,
    pendingServiceRequestsCount: context.pendingServiceRequestsCount
  });
  return context;
}
