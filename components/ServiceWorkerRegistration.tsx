'use client';

import { useEffect } from 'react';

/**
 * Componente para registrar el Service Worker
 * Solo se ejecuta en producción y en el cliente
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Solo registrar en producción y si el navegador soporta service workers
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      // Registrar el service worker
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[SW] Service Worker registrado:', registration.scope);

          // Verificar actualizaciones cada hora
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
        })
        .catch((error) => {
          console.error('[SW] Error al registrar Service Worker:', error);
        });

      // Escuchar mensajes del service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'CACHE_UPDATED') {
          console.log('[SW] Cache actualizado');
        }
      });

      // Detectar cuando hay una nueva versión disponible
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] Nueva versión disponible, recargando...');
        window.location.reload();
      });
    }
  }, []);

  return null; // Este componente no renderiza nada
}
