'use client';

import { useEffect, useRef, useState } from 'react';
import { sseManager } from '@/lib/utils/SSEManager';

/**
 * `useSSE` — subscribes to a Server-Sent Events URL via the shared SSEManager singleton.
 * Multiple hooks can subscribe to the same URL and they will share one EventSource.
 */
export function useSSE(url: string | null, onMessage: (payload: any) => void) {
  const onMessageRef = useRef(onMessage);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!url || typeof window === 'undefined') return;

    const listener = (payload: any) => {
      onMessageRef.current(payload);
    };

    const unsubscribe = sseManager.subscribe(url, listener);

    const interval = setInterval(() => {
      setIsConnected(sseManager.getConnectionState(url).isConnected);
    }, 2000);
    setIsConnected(sseManager.getConnectionState(url).isConnected);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [url]);

  return {
    isConnected,
    reconnect: () => {
      if (url) sseManager.reconnect(url);
    }
  };
}
