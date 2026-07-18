'use client';

import { useEffect, useRef, useState } from 'react';
import { sseManager } from '@/lib/utils/SSEManager';

export function useSharedSSE(
  url: string | null,
  onMessage: (payload: any) => void
): { isConnected: boolean; reconnect: () => void } {
  const onMessageRef = useRef(onMessage);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!url || typeof window === 'undefined') return;

    // Use a stable listener that forwards to the latest onMessageRef
    const listener = (payload: any) => {
      onMessageRef.current(payload);
    };

    const unsubscribe = sseManager.subscribe(url, listener);

    // Poll connection state periodically (no event-driven way to detect it)
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
