'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell } from '@fortawesome/free-solid-svg-icons';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationBadgeProps {
  className?: string;
}

export function NotificationBadge({ className = '' }: NotificationBadgeProps) {
  const [notificationCount, setNotificationCount] = useState(0);
  const { lastNotification } = useNotifications();

  // Efecto para incrementar el contador cuando llega una nueva notificación
  useEffect(() => {
    if (lastNotification) {
      setNotificationCount(prev => prev + 1);
      
      // Resetear contador después de 30 segundos
      setTimeout(() => {
        setNotificationCount(prev => Math.max(0, prev - 1));
      }, 30000);
    }
  }, [lastNotification]);

  if (notificationCount === 0) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <FontAwesomeIcon icon={faBell} className="text-gray-600" />
      <Badge 
        variant="destructive" 
        className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
      >
        {notificationCount > 99 ? '99+' : notificationCount}
      </Badge>
    </div>
  );
}