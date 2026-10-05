import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ query: vi.fn(), enviar: vi.fn() }));
vi.mock('@/lib/database/db', () => ({ query: mocks.query }));
vi.mock('expo-server-sdk', () => ({
  Expo: class {
    static isExpoPushToken(token: unknown) {
      return token === 'ExponentPushToken[activo]';
    }
    chunkPushNotifications(mensajes: unknown[]) {
      return [mensajes];
    }
    sendPushNotificationsAsync(mensajes: unknown[]) {
      return mocks.enviar(mensajes);
    }
  }
}));
import { sendPushNotification, sendPushByRole } from '@/modules/comunicaciones/push/servicio';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.query.mockResolvedValue([{ push_token: 'ExponentPushToken[activo]' }]);
  mocks.enviar.mockResolvedValue([{ status: 'error', details: { error: 'DeviceNotRegistered' } }]);
});

describe('tokens de Comunicaciones', () => {
  it('envía a los tokens registrados y elimina los inválidos de su tabla', async () => {
    await sendPushNotification('usuario-1', 'Título', 'Mensaje');
    expect(mocks.query.mock.calls[0][0]).toContain('FROM push_tokens');
    expect(mocks.enviar).toHaveBeenCalledWith([
      expect.objectContaining({ to: 'ExponentPushToken[activo]' })
    ]);
    expect(mocks.query).toHaveBeenLastCalledWith('DELETE FROM push_tokens WHERE token = ?', [
      'ExponentPushToken[activo]'
    ]);
    expect(mocks.query.mock.calls.some(([sql]) => /UPDATE usuarios/.test(sql))).toBe(false);
  });

  it('filtra destinatarios por rol sin escribir datos de identidad', async () => {
    await sendPushByRole('administrador', 'Título', 'Mensaje');
    expect(mocks.query.mock.calls[0][0]).toContain('INNER JOIN usuarios');
    expect(mocks.query.mock.calls[0][1]).toEqual(['administrador']);
    expect(mocks.query).toHaveBeenLastCalledWith('DELETE FROM push_tokens WHERE token = ?', [
      'ExponentPushToken[activo]'
    ]);
  });

  it('una lista vacía no consulta la base ni envía mensajes', async () => {
    await sendPushNotification([], 'Título', 'Mensaje');
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.enviar).not.toHaveBeenCalled();
  });
});
