'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

export function NotificationStatus() {
  const { isConnected } = useNotifications();

  // Si no está conectado, no mostrar nada (evita el badge rojo)
  if (!isConnected) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant="default"
        className="flex items-center gap-1"
        title="Estado de conexión con el servidor de notificaciones. Conectado"
      >
        <Wifi className="h-3 w-3" />
        Conectado
      </Badge>
    </div>
  );
} 