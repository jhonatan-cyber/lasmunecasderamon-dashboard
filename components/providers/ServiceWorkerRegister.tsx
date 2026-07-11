'use client';

import { useEffect, useState, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';

/** How long to wait before refreshing page after SW update (ms) */
const RELOAD_DELAY = 3_000;

/**
 * Hook to register and manage the Workbox-powered service worker.
 *
 * Provides:
 * - Automatic registration after page load
 * - Update detection with user notification
 * - Cache clearing via postMessage
 * - Version info for debugging
 */
export function useServiceWorker() {
  const [swReady, setSwReady] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) {
      logger.info('[SW] Service Workers not supported');
      setError('Service Workers not supported');
      return;
    }

    let isMounted = true;
    let swRegistration: ServiceWorkerRegistration | null = null;

    async function register() {
      try {
        swRegistration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none'
        });

        if (!isMounted) {
          await swRegistration.unregister();
          return;
        }

        setRegistration(swRegistration);
        setSwReady(true);
        logger.info('[SW] Registered successfully');

        // Handle updates
        swRegistration.addEventListener('updatefound', () => {
          const newWorker = swRegistration!.installing;
          if (!newWorker) return;

          logger.info('[SW] Update found');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available — old one is still active
              setUpdateAvailable(true);
              logger.info('[SW] New version ready');
            }
          });
        });
      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Unknown error';
        logger.error('[SW] Registration failed:', err);
        setError(message);
      }
    }

    // Register after page load for non-blocking UX
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register);
    }

    // Listen for controller changes (SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      logger.info('[SW] Controller changed — new version active');
    });

    return () => {
      isMounted = false;
      window.removeEventListener('load', register);
    };
  }, []);

  /** Apply the waiting update: post SKIP_WAITING, then reload */
  const applyUpdate = useCallback(async () => {
    if (!registration?.waiting) return;

    logger.info('[SW] Applying update');

    // Listen for controller change, then reload
    const onControllerChange = () => {
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    // Tell the waiting SW to activate
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Fallback: reload even if controller doesn't change
    setTimeout(() => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      window.location.reload();
    }, RELOAD_DELAY);
  }, [registration]);

  /** Clear all caches via the SW */
  const clearCache = useCallback(async () => {
    if (registration?.active) {
      registration.active.postMessage({ type: 'CLEAR_CACHE' });
      logger.info('[SW] Cache clear requested');
    }
  }, [registration]);

  /** Get SW version info */
  const getVersion = useCallback(async (): Promise<string | null> => {
    if (!registration?.active) return null;

    return new Promise(resolve => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = event => {
        resolve(event.data?.version ?? null);
      };
      registration.active?.postMessage({ type: 'GET_VERSION' }, [messageChannel.port2]);
    });
  }, [registration]);

  return {
    swReady,
    updateAvailable,
    registration,
    error,
    applyUpdate,
    clearCache,
    getVersion
  } as const;
}

/**
 * Service Worker Register — Client component for the layout.
 *
 * Registers the SW silently on mount. Optionally renders an update banner
 * when a new version is available.
 */
export default function ServiceWorkerRegister() {
  const { updateAvailable, applyUpdate } = useServiceWorker();

  return (
    <>
      {/* Update available banner — only show when there's a waiting update */}
      {updateAvailable && (
        <div className='fixed bottom-4 right-4 z-[9999] flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 shadow-lg backdrop-blur-md'>
          <div className='flex-1 text-sm text-blue-200'>
            <span className='font-medium text-blue-100'>Nueva versión disponible</span>
            <p className='mt-0.5 text-xs text-blue-300/70'>
              Actualiza para obtener los últimos cambios
            </p>
          </div>
          <button
            onClick={applyUpdate}
            className='rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-blue-400 active:scale-95'
          >
            Actualizar
          </button>
        </div>
      )}
    </>
  );
}
