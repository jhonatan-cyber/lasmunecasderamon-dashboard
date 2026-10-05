import { vi } from 'vitest';

// Las pruebas de persistencia nunca envían mensajes a cuentas reales.
// Se simula el transporte para conservar las lecturas de configuración.
vi.mock('twilio', () => ({
  default: () => ({
    messages: { create: vi.fn(async () => ({ sid: 'TEST_SIN_ENVIO' })) }
  })
}));

vi.mock('expo-server-sdk', () => ({
  Expo: class {
    static isExpoPushToken() {
      return true;
    }
    chunkPushNotifications<T>(mensajes: T[]) {
      return [mensajes];
    }
    async sendPushNotificationsAsync(mensajes: unknown[]) {
      return mensajes.map(() => ({ status: 'ok', id: 'TEST_SIN_ENVIO' }));
    }
  }
}));
