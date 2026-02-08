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
  return context;
}
