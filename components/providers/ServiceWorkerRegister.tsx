'use client';

import { useEffect, useState, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';

/** How long to wait before refreshing page after SW update (ms) */
const RELOAD_DELAY = 3_000;

/**
 * Prefijo de las cachés que crea `/sw.js` (ver `public/sw-template.js`): `lmr-precache-v1`,
 * `lmr-static-v1`, etc. Sólo se borran las que empiezan así, para no tocar la caché de
 * otra aplicación del mismo origen.
 */
const PREFIJO_CACHE_SW = 'lmr-';

/**
 * ¿Toca registrar el service worker en este entorno?
 *
 * Sólo en producción. En desarrollo el SW responde con el bundle que cacheó en la carga
 * anterior: la pantalla llega a mostrar campos o precios que el código ya no tiene, sin
 * error de consola, porque el HTML y los chunks sí cargan — sólo que viejos. Es la
 * diferencia entre «edité el código y no cambió nada» y «edité el código y hay que vaciar
 * cachés a mano».
 *
 * `?sw=1` fuerza el registro para ensayar el SW en local y `?sw=0` lo apaga también en
 * producción, que es lo que hace falta cuando el SW está sirviendo algo raro.
 */
export function debeRegistrarServiceWorker(search: string, esProduccion: boolean): boolean {
  const forzado = new URLSearchParams(search).get('sw');
  if (forzado === '1') return true;
  if (forzado === '0') return false;
  return esProduccion;
}

/**
 * Suelta el service worker y sus cachés.
 *
 * Hace falta además de «no registrar»: el SW que quedó instalado en una carga anterior
 * sigue controlando la página y sirviendo bundles viejos aunque nadie lo vuelva a
 * registrar. Sólo se llama al montar, nunca desde el cleanup del efecto —la registración
 * es un recurso del origen, no del componente— y sólo en entornos donde el SW no debe
 * estar.
 */
async function soltarServiceWorker(): Promise<boolean> {
  const registros = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registros.map(registro => registro.unregister()));
  let borradas = 0;
  if (typeof caches !== 'undefined') {
    const claves = await caches.keys();
    const propias = claves.filter(clave => clave.startsWith(PREFIJO_CACHE_SW));
    borradas = await Promise.all(propias.map(clave => caches.delete(clave))).then(
      resultados => resultados.filter(Boolean).length
    );
  }
  return registros.length > 0 || borradas > 0;
}

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

    // En desarrollo no se registra y además se suelta lo que haya quedado de antes: sin
    // esto, el SW heredado sigue mandando sobre la página y sirviendo el bundle viejo.
    if (
      !debeRegistrarServiceWorker(window.location.search, process.env.NODE_ENV === 'production')
    ) {
      soltarServiceWorker()
        .then(liberado => {
          if (liberado) logger.info('[SW] Entorno sin SW: se liberó el que estaba instalado');
          else logger.info('[SW] Entorno sin SW y sin SW heredado');
        })
        .catch(err => logger.warn('[SW] No se pudo liberar el SW heredado:', err));
      return;
    }

    async function register() {
      try {
        // Pass the page query string through to the SW script URL so behavior
        // can be overridden for local testing (e.g. ?forceProd=1 → production
        // precache over http). No query = plain /sw.js as always.
        const swUrl = '/sw.js' + (window.location.search || '');
        swRegistration = await navigator.serviceWorker.register(swUrl, {
          scope: '/',
          updateViaCache: 'none'
        });

        /*
         * Si el efecto ya se limpió, no se toca la registración: es un recurso
         * del **origen**, no del componente, y desregistrarla desde acá es lo
         * que rompía el SW en dev.
         *
         * Con `reactStrictMode: true` el efecto corre, se limpia y vuelve a
         * correr. El `register()` del primer efecto resolvía con `isMounted` en
         * false y llamaba a `unregister()`, borrando la registración que el
         * segundo efecto acababa de crear. Resultado: la página perdía el
         * control del SW en la navegación siguiente y quedaba sin
         * `lmr-navigation-v1` ni `lmr-api-v1`, es decir sin offline.
         */
        if (!isMounted) return;

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

    // Listen for controller changes (SW activated). El handler se guarda para
    // poder quitarlo: sin esto, el doble montaje de StrictMode dejaba un
    // listener extra por cada pasada del efecto.
    const onControllerChange = () => {
      logger.info('[SW] Controller changed — new version active');
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      isMounted = false;
      window.removeEventListener('load', register);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
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
        <div className='fixed bottom-4 right-4 z-9999 flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 shadow-lg backdrop-blur-md'>
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
