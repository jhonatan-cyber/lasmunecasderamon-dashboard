'use client';

import { useNotificationsContext } from '@/contexts/NotificationsContext';

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  useNotificationsContext();

  return <>{children}</>;
}
