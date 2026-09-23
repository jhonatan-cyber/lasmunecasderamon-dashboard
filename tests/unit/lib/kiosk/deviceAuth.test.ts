// @vitest-environment node
//
// Entorno node a propósito: bajo jsdom, vitest resuelve jose a su build `webapi`, que
// rechaza las claves simétricas del realm de node. Esta lógica es de servidor, así que
// se prueba donde corre.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-validation';
  process.env.KIOSK_DEVICE_SECRET = 'secreto-del-local-para-la-pantalla';
});

const cookieValue = { value: undefined as string | undefined };

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === 'kiosk_token' && cookieValue.value ? { value: cookieValue.value } : undefined,
    set: vi.fn(),
    delete: vi.fn()
  })
}));

vi.mock('@/lib/utils/logger', () => {
  const mocks = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), captureException: vi.fn() };
  return { logger: mocks, default: mocks, auditLogger: {} };
});

import {
  KIOSK_COOKIE,
  createDeviceToken,
  getKioskDevice,
  isKioskConfigured,
  matchesDeviceSecret,
  verifyDeviceToken
} from '@/lib/kiosk/deviceAuth';

describe('credencial del kiosko', () => {
  beforeEach(() => {
    cookieValue.value = undefined;
  });

  it('la cookie tiene un nombre propio, distinto de la sesión de usuario', () => {
    expect(KIOSK_COOKIE).toBe('kiosk_token');
  });

  it('está configurada cuando hay un secreto largo', () => {
    expect(isKioskConfigured()).toBe(true);
  });

  describe('secreto del dispositivo', () => {
    it('acepta el secreto configurado', () => {
      expect(matchesDeviceSecret('secreto-del-local-para-la-pantalla')).toBe(true);
    });

    it('rechaza secretos parecidos, vacíos o de otro tipo', () => {
      expect(matchesDeviceSecret('secreto-del-local-para-la-pantall')).toBe(false);
      expect(matchesDeviceSecret('secreto-del-local-para-la-pantalla ')).toBe(false);
      expect(matchesDeviceSecret('')).toBe(false);
      expect(matchesDeviceSecret(null)).toBe(false);
      expect(matchesDeviceSecret({ secret: 'secreto-del-local-para-la-pantalla' })).toBe(false);
    });
  });

  describe('token de dispositivo', () => {
    it('viaja con alcance kiosk y se verifica con el secreto del local', async () => {
      const token = await createDeviceToken('device-1');
      expect(await verifyDeviceToken(token)).toBe('device-1');
    });

    it('no acepta un token de sesión de usuario como credencial de pantalla', async () => {
      // Un JWT firmado con JWT_SECRET (el de las sesiones) no sirve acá: se firma con el
      // secreto del kiosko, así que un token de persona no puede hacerse pasar por pantalla.
      const { SignJWT } = await import('jose');
      const tokenDePersona = await new SignJWT({ id: 'u-1', role: 'administrador' })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(process.env.JWT_SECRET));

      expect(await verifyDeviceToken(tokenDePersona)).toBeNull();
    });

    it('rechaza un token manipulado o vacío', async () => {
      const token = await createDeviceToken('device-1');
      expect(await verifyDeviceToken(`${token}x`)).toBeNull();
      expect(await verifyDeviceToken(undefined)).toBeNull();
      expect(await verifyDeviceToken('')).toBeNull();
    });
  });

  describe('lectura de la petición', () => {
    it('devuelve el dispositivo cuando la cookie es válida', async () => {
      cookieValue.value = await createDeviceToken('device-9');
      expect(await getKioskDevice()).toBe('device-9');
    });

    it('devuelve null sin cookie o con una cookie que no verifica', async () => {
      expect(await getKioskDevice()).toBeNull();
      cookieValue.value = 'no-es-un-token';
      expect(await getKioskDevice()).toBeNull();
    });
  });
});
