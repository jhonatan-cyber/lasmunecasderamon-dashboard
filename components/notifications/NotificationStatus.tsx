'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RotateCcw } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

export function NotificationStatus() {
  const [isReconnecting, setIsReconnecting] = useState(false);
  const { isConnected, connectionAttempts, reconnect } = useNotifications();

  const handleReconnect = () => {
    setIsReconnecting(true);
    reconnect();
    // Simular tiempo de reconexión
    setTimeout(() => {
      setIsReconnecting(false);
    }, 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={isConnected ? "default" : "destructive"}
        className="flex items-center gap-1"
        title={`Estado de conexión con el servidor de notificaciones. ${isConnected ? 'Conectado' : `Desconectado (${connectionAttempts} intentos)`}`}
      >
        {isConnected ? (
          <>
            <Wifi className="h-3 w-3" />
            Conectado
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            Desconectado
          </>
        )}
      </Badge>
      {!isConnected && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReconnect}
          disabled={isReconnecting}
          className="h-6 px-2"
          title="Reconectar"
        >
          <RotateCcw className={`h-3 w-3 ${isReconnecting ? 'animate-spin' : ''}`} />
        </Button>
      )}
    </div>
  );
} 