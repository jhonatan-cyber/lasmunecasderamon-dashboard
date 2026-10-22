'use client';

import { useEffect, useRef, useState } from 'react';
import { mjpegFrames } from '@/lib/utils/mjpegFrames';

export function useBiometricPreview(deviceId: string, open: boolean, live: boolean) {
  const [frame, setFrame] = useState<{ deviceId: string; url: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const currentUrl = useRef<string | undefined>(undefined);

  useEffect(() => {
    setFrame(null);
    setFailed(false);
    return () => {
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
      currentUrl.current = undefined;
    };
  }, [deviceId, open]);

  useEffect(() => {
    if (!open || !deviceId || !live) return;
    let stopped = false;
    let controller: AbortController | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;

    async function connect() {
      if (stopped || document.hidden) return;
      const connection = new AbortController();
      controller = connection;
      let watchdog = setTimeout(() => connection.abort(), 20000);
      try {
        const response = await fetch(`/api/biometric/devices/${deviceId}/video`, {
          cache: 'no-store',
          signal: connection.signal
        });
        if (!response.ok || !response.body) throw new Error('Video unavailable');
        for await (const blob of mjpegFrames(response.body)) {
          if (stopped || connection.signal.aborted) break;
          clearTimeout(watchdog);
          watchdog = setTimeout(() => connection.abort(), 10000);
          const url = URL.createObjectURL(blob);
          const previous = currentUrl.current;
          currentUrl.current = url;
          setFrame({ deviceId, url });
          setFailed(false);
          if (previous) URL.revokeObjectURL(previous);
        }
      } catch {
      } finally {
        clearTimeout(watchdog);
        connection.abort();
        if (controller === connection) controller = undefined;
        if (!stopped && !document.hidden) {
          setFailed(true);
          retry = setTimeout(connect, 2000);
        }
      }
    }

    function visibilityChanged() {
      clearTimeout(retry);
      if (document.hidden) controller?.abort();
      else if (!controller) void connect();
    }
    document.addEventListener('visibilitychange', visibilityChanged);
    void connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      controller?.abort();
      document.removeEventListener('visibilitychange', visibilityChanged);
    };
  }, [deviceId, open, live]);

  return { src: open && frame?.deviceId === deviceId ? frame.url : undefined, failed };
}
