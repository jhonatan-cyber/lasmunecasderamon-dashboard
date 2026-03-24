'use client';

import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNotificationsContext } from '@/contexts/NotificationsContext';

interface NotificationBadgeProps {
  className?: string;
}

export function NotificationBadge({ className = '' }: NotificationBadgeProps) {
  const context = useNotificationsContext();
  const pendingOrdersCount = context?.pendingOrdersCount || 0;
  const pendingServiceRequestsCount = context?.pendingServiceRequestsCount || 0;
  const totalNotifications = pendingOrdersCount + pendingServiceRequestsCount;

  if (totalNotifications === 0) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <Bell className="text-gray-600" size={20} />
      <Badge
        variant="destructive"
        className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
      >
        {totalNotifications > 99 ? '99+' : totalNotifications}
      </Badge>
    </div>
  );
}
