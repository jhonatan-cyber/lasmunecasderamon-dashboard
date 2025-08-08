'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, WifiOff, RotateCcw } from 'lucide-react';
import { useState } from 'react';

export function NotificationStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleReconnect = () => {
    setIsReconnecting(true);
    // Simular reconexión
    setTimeout(() => {
      setIsConnected(true);
      setIsReconnecting(false);
    }, 2000);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Badge 
              variant={isConnected ? "default" : "destructive"}
              className="flex items-center gap-1"
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
              >
                <RotateCcw className={`h-3 w-3 ${isReconnecting ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Estado de conexión con el servidor de notificaciones</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 