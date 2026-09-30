'use client';
import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ServiceWorkerRegister from '@/components/providers/ServiceWorkerRegister';

/**
 * Registro del service worker del dashboard.
 *
 * Este test cubre el bug que dejaba al dashboard sin SW —y por lo tanto sin
 * ninguna capa offline— en desarrollo: el cleanup del efecto llamaba a
 * `unregister()` cuando la promesa de `register()` resolvía con el efecto ya
 * limpiado.
 *
 * Con `reactStrictMode: true` ese es el orden real: el efecto corre, se limpia
 * y vuelve a correr. El `register()` del primer efecto resolvía con
 * `isMounted === false` y desregistraba el SW, borrando la registración que el
 * segundo efecto acababa de crear (la registración es única por origen).
 *
 * La registración es un recurso del **origen**, no del componente: limpiar el
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

describe('ServiceWorkerRegister', () => {
  let registration: ReturnType<typeof createRegistration>;
  let register: ReturnType<typeof vi.fn>;
  let serviceWorker: {
    register: ReturnType<typeof vi.fn>;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
    controller: null;
  };

  beforeEach(() => {
    registration = createRegistration();
    register = vi.fn(() => Promise.resolve(registration));
    serviceWorker = {
      register,
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
  });

  afterEach(cleanup);

  it('registra /sw.js al montar', async () => {
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
});
