'use client';

import { useEffect, useRef } from 'react';
import { sseManager } from '@/lib/utils/SSEManager';
import { appEventBus } from '@/lib/utils/eventBus';
import logger from '@/lib/utils/logger';

const SSE_NOTIFICATION_URL = '/api/notifications/sse';


export function useSharedSSE(
  url: string | null,
  onMessage: (payload: any) => void
): { isConnected: boolean; reconnect: () => void } {
  const onMessageRef = useRef(onMessage);
  const isMountedRef = useRef(true);

  
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

    
    if (url === SSE_NOTIFICATION_URL) {
      
      sseManager.connect(url);

      
      const unsub = appEventBus.on('sse-message', payload => {
        if (isMountedRef.current) {
          onMessageRef.current(payload);
        }
      });

      return unsub; 
    }

    
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
