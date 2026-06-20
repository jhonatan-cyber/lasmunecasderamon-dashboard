'use client';

/* eslint-disable */
import { useEffect, useRef, useCallback, useState } from 'react';
import logger from '@/lib/utils/logger';

export function useSSE(url: string | null, onMessage: (payload: any) => void) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMessageRef = useRef(onMessage);
  const isMountedRef = useRef(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const connect = useCallback(() => {
    if (typeof window === 'undefined' || !url || !isMountedRef.current) return;

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    logger.info(`[SSE] Conectando a ${url}...`);
    const es = new EventSource(url);

    es.onopen = () => {
      if (isMountedRef.current) {
        setIsConnected(true);
      }
    };

    es.onmessage = event => {
      if (!isMountedRef.current) return;
      try {
        const payload = JSON.parse(event.data);
        onMessageRef.current(payload);
      } catch (err) {
        logger.captureException(err, { context: 'SSE:parseMessage' });
      }
    };

    es.onerror = () => {
      if (!isMountedRef.current) return;
      setIsConnected(false);
      logger.warn('[SSE] Error de conexión, reintentando en 5s...');
      es.close();
      eventSourceRef.current = null;
      retryTimeoutRef.current = setTimeout(connect, 5000);
    };

    eventSourceRef.current = es;
  }, [url]);

  useEffect(() => {
    if (url) {
      connect();
    }
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      if (eventSourceRef.current) {
        logger.info(`[SSE] Cerrando conexión con ${url}`);
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [url, connect]);

  return {
    isConnected,
    reconnect: connect
  };
}
