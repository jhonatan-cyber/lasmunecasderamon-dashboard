/* eslint-disable */
import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Hook para manejar conexiones SSE de forma robusta y centralizada.
 */
export function useSSE(url: string | null, onMessage: (payload: any) => void) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMessageRef = useRef(onMessage);
  const [isConnected, setIsConnected] = useState(false);

  // Mantener el callback actualizado sin relanzar el efecto
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (typeof window === 'undefined' || !url) return;

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Evitar múltiples conexiones
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    console.log(`[SSE] Conectando a ${url}...`);
    const es = new EventSource(url);

    es.onopen = () => {
      setIsConnected(true);
    };

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        onMessageRef.current(payload);
      } catch (err) {
        console.error('[SSE] Error al parsear mensaje:', err);
      }
    };

    es.onerror = () => {
      setIsConnected(false);
      console.warn('[SSE] Error de conexión, reintentando en 5s...');
      es.close();
      eventSourceRef.current = null;
      retryTimeoutRef.current = setTimeout(connect, 5000);
    };

    eventSourceRef.current = es;
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      if (eventSourceRef.current) {
        console.log(`[SSE] Cerrando conexión con ${url}`);
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    };
  }, [connect]);

  return {
    isConnected,
    reconnect: connect
  };
}

