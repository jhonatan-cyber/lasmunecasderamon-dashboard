'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    let intervalId: number | undefined;
    let hasReloadedForControllerChange = false;
    const isLocalHost =
      typeof window !== 'undefined' &&
      ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const isLanHost =
      typeof window !== 'undefined' &&
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(window.location.hostname);
    const isLoginRoute = typeof window !== 'undefined' && window.location.pathname === '/login';

    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production' &&
      !isLocalHost &&
      !isLanHost
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(registration => {
          intervalId = window.setInterval(
            () => {
              registration.update();
            },
            60 * 60 * 1000
          );
        })
        .catch(() => {});

      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'CACHE_UPDATED') {
          return;
        }
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (isLoginRoute) return;
        if (hasReloadedForControllerChange) return;
        hasReloadedForControllerChange = true;
        window.location.reload();
      });
    }

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  return null;
}
