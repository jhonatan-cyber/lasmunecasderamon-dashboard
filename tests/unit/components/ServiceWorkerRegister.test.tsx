'use client';
import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ServiceWorkerRegister, {
  debeRegistrarServiceWorker
} from '@/components/providers/ServiceWorkerRegister';

/**
 * Registro del service worker del dashboard.
 *
 * El SW sólo se registra en producción: en desarrollo servía el bundle de la carga
 * anterior y la pantalla mostraba una versión vieja del código sin dar ningún error. En vez
 * de no registrar, hay que además soltar el SW que ya estuviera instalado, porque sigue
 * controlando la página aunque nadie lo vuelva a registrar.
 *
 * Este archivo también cubre el bug que dejaba al dashboard sin SW —y por lo tanto sin
 * ninguna capa offline— en producción: el cleanup del efecto llamaba a `unregister()`
 * cuando la promesa de `register()` resolvía con el efecto ya limpiado. Con
 * `reactStrictMode: true` ese es el orden real: el efecto corre, se limpia y vuelve a
 * correr, y la registración es un recurso del **origen**, no del componente: limpiar el
 * efecto nunca debe desregistrar el service worker.
 */

const createRegistration = () => ({
  scope: 'http://localhost:3000/',
  addEventListener: vi.fn(),
  unregister: vi.fn(() => Promise.resolve(true)),
  installing: null,
  waiting: null,
  active: null
});

describe('debeRegistrarServiceWorker', () => {
  it('registra sólo en producción', () => {
    expect(debeRegistrarServiceWorker('', true)).toBe(true);
    expect(debeRegistrarServiceWorker('', false)).toBe(false);
  });

  it('deja forzar el registro en local y apagarlo en producción', () => {
    // `?sw=1` sirve para probar el SW en local; `?sw=0` para salir de él en producción.
    expect(debeRegistrarServiceWorker('?sw=1', false)).toBe(true);
    expect(debeRegistrarServiceWorker('?sw=0', true)).toBe(false);
    // Cualquier otro parámetro no decide nada.
    expect(debeRegistrarServiceWorker('?tab=bar', false)).toBe(false);
    expect(debeRegistrarServiceWorker('?tab=bar', true)).toBe(true);
  });
});

describe('ServiceWorkerRegister', () => {
  let registration: ReturnType<typeof createRegistration>;
  let register: ReturnType<typeof vi.fn>;
  let getRegistrations: ReturnType<typeof vi.fn>;
  let serviceWorker: {
    register: ReturnType<typeof vi.fn>;
    getRegistrations: ReturnType<typeof vi.fn>;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
    controller: null;
  };
  let cacheKeys: string[];
  let deleteCache: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    registration = createRegistration();
    register = vi.fn(() => Promise.resolve(registration));
    getRegistrations = vi.fn(() => Promise.resolve([]));
    serviceWorker = {
      register,
      getRegistrations,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      controller: null
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: serviceWorker
    });
    // El componente registra al instante si el documento ya terminó de cargar.
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => 'complete'
    });

    cacheKeys = [];
    deleteCache = vi.fn(() => Promise.resolve(true));
    vi.stubGlobal('caches', {
      keys: vi.fn(() => Promise.resolve(cacheKeys)),
      delete: deleteCache
    });
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('registra /sw.js al montar en producción', async () => {
    render(<ServiceWorkerRegister />);

    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    expect(register.mock.calls[0][0]).toBe('/sw.js');
  });

  it('no desregistra el SW cuando la promesa resuelve con el efecto ya limpiado', async () => {
    let resolver: (value: ReturnType<typeof createRegistration>) => void = () => {};
    register.mockImplementation(
      () =>
        new Promise<ReturnType<typeof createRegistration>>(resolve => {
          resolver = resolve;
        })
    );

    const { unmount } = render(<ServiceWorkerRegister />);
    expect(register).toHaveBeenCalledTimes(1);

    // Orden de StrictMode: el efecto se limpia antes de que register() resuelva.
    unmount();
    resolver(registration);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(registration.unregister).not.toHaveBeenCalled();
  });

  it('quita su listener de controllerchange al desmontar', async () => {
    const { unmount } = render(<ServiceWorkerRegister />);

    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    unmount();

    expect(serviceWorker.removeEventListener).toHaveBeenCalledWith(
      'controllerchange',
      expect.any(Function)
    );
  });

  describe('en desarrollo', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
    });

    it('no registra nada', async () => {
      render(<ServiceWorkerRegister />);

      await waitFor(() => expect(getRegistrations).toHaveBeenCalled());
      expect(register).not.toHaveBeenCalled();
    });

    it('libera el SW que quedó instalado y sus cachés', async () => {
      // Sin esto, el SW de una carga anterior sigue controlando la página y sirviendo el
      // bundle viejo: «no registrar» no basta para dejar de ver la versión anterior.
      const heredado = createRegistration();
      getRegistrations.mockResolvedValue([heredado]);
      cacheKeys = ['lmr-precache-v1', 'lmr-navigation-v1', 'otra-app-cache'];

      render(<ServiceWorkerRegister />);

      await waitFor(() => expect(heredado.unregister).toHaveBeenCalled());
      // Sólo las cachés del dashboard: la de otra app del mismo origen se respeta.
      expect(deleteCache.mock.calls.flat()).toEqual(['lmr-precache-v1', 'lmr-navigation-v1']);
    });

    it('sigue registrando con ?sw=1 para ensayar el SW en local', async () => {
      window.history.replaceState({}, '', '/settings?sw=1');

      render(<ServiceWorkerRegister />);

      await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
      expect(getRegistrations).not.toHaveBeenCalled();
      window.history.replaceState({}, '', '/');
    });
  });
});
