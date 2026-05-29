'use client';

import { useEffect, useRef } from 'react';
import { sseManager } from '@/lib/utils/SSEManager';
import { appEventBus } from '@/lib/utils/eventBus';
import logger from '@/lib/utils/logger';

const SSE_NOTIFICATION_URL = '/api/notifications/sse';

/**
 * Hook que se suscribe al SSEManager singleton en lugar de abrir una nueva conexión.
 * Todos los hooks que antes llamaban useSSE('/api/notifications/sse', callback)
 * deben migrar a éste para compartir una única conexión.
 */
export function useSharedSSE(
  url: string | null,
  onMessage: (payload: any) => void
): { isConnected: boolean; reconnect: () => void } {
  const onMessageRef = useRef(onMessage);
  const isMountedRef = useRef(true);

  // Mantener referencia estable al callback sin relanzar el efecto
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!url || typeof window === 'undefined') return;

    // Si es el endpoint centralizado, reutilizar el singleton
    if (url === SSE_NOTIFICATION_URL) {
      // Iniciar la conexión del singleton si no está activa
      sseManager.connect(url);

      // Suscribirse al bus de eventos para recibir mensajes
      const unsub = appEventBus.on('sse-message', payload => {
        if (isMountedRef.current) {
          onMessageRef.current(payload);
        }
      });

      return unsub; // Limpia la suscripción al desmontar — la conexión sigue viva para otros consumidores
    }

    // Para URLs distintas, abrir una conexión independiente (comportamiento anterior)
    const es = new EventSource(url);
    es.onmessage = event => {
      if (!isMountedRef.current) return;
      try {
        const payload = JSON.parse(event.data);
        onMessageRef.current(payload);
      } catch (err) {
        logger.captureException(err, { context: 'SharedSSE:parseMessage' });
      }
    };
    es.onerror = () => {
      logger.warn('[useSharedSSE] Error en conexión independiente:', url);
    };
    return () => es.close();
  }, [url]);

  return {
    isConnected: true,
    reconnect: () => {
      if (url === SSE_NOTIFICATION_URL) sseManager.connect(url);
    }
  };
}
