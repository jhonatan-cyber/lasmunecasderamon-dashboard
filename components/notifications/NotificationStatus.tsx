'use client';

import { useNotifications } from '@/hooks/useNotifications';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export function NotificationStatus() {
  const { isConnected, connectionAttempts, reconnect } = useNotifications();
  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      await reconnect();
    } finally {
      setTimeout(() => setIsReconnecting(false), 2000);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center space-x-2">
            <Badge 
              variant={isConnected ? "default" : "destructive"}
              className="flex items-center space-x-1"
            >
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3" />
                  <span className="text-xs">Conectado</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  <span className="text-xs">
                    {connectionAttempts > 0 ? `Reconectando (${connectionAttempts})` : 'Desconectado'}
                  </span>
                </>
              )}
            </Badge>
            
            {!isConnected && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleReconnect}
                disabled={isReconnecting}
                className="h-6 px-2"
              >
                <RefreshCw className={`h-3 w-3 ${isReconnecting ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            {isConnected ? (
              <div>
                <p className="font-semibold text-green-600">Notificaciones activas</p>
                <p className="text-xs text-gray-500">Recibiendo notificaciones en tiempo real</p>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-red-600">Notificaciones inactivas</p>
                <p className="text-xs text-gray-500">
                  {connectionAttempts > 0 
                    ? `Intentos de reconexión: ${connectionAttempts}/5`
                    : 'No se pudo conectar a las notificaciones'
                  }
                </p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 