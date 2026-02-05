'use client';

import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNotificationsContext } from '@/contexts/NotificationsContext';

interface NotificationBadgeProps {
  className?: string;
}

export function NotificationBadge({ className = '' }: NotificationBadgeProps) {
  console.log('[NotificationBadge] Inicializando...');
  
  try {
    const context = useNotificationsContext();
    console.log('[NotificationBadge] Context completo:', context);
    
    const pendingOrdersCount = context?.pendingOrdersCount || 0;
    const pendingServiceRequestsCount = context?.pendingServiceRequestsCount || 0;
    
    // Sumar ambos contadores
    const totalNotifications = pendingOrdersCount + pendingServiceRequestsCount;

    console.log('[NotificationBadge] Valores calculados:', {
      pendingOrdersCount,
      pendingServiceRequestsCount,
      totalNotifications
    });

    if (totalNotifications === 0) {
      return null;
    }

    return (
      <div className={`relative ${className}`}>
        <Bell className="text-gray-600" size={20} />
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
        >
          {totalNotifications > 99 ? '99+' : totalNotifications}
        </Badge>
      </div>
    );
  } catch (error) {
    console.error('[NotificationBadge] Error:', error);
    return null;
  }
}