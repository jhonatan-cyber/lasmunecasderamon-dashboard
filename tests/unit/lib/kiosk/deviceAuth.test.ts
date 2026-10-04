// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'crypto';
const harness = vi.hoisted(() => ({ query: vi.fn(), cookie: undefined as string | undefined }));
vi.mock('@/lib/database/db', () => ({
  query: harness.query,
  withTransaction: async (callback: any) => callback(harness.query)
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => (harness.cookie ? { value: harness.cookie } : undefined) })
}));
vi.mock('@/lib/utils/logger', () => ({ default: { warn: vi.fn() } }));
import {
  getKioskDevice,
  provisionDevice,
  renewDevice,
  verifyDeviceToken,
  listDevices,
  revokeDevice
} from '@/modules/asistencia/kioskos/deviceAuth';
beforeEach(() => {
  harness.cookie = undefined;
  harness.query.mockReset().mockResolvedValue([]);
});
describe('credenciales automaticas de dispositivos', () => {
  it('genera credenciales aleatorias y persiste solo su hash sin secreto de entorno', async () => {
    const first = await provisionDevice('Entrada', 'admin-1');
    const second = await provisionDevice('Bar', 'admin-1');
    expect(first.token).toMatch(/^kiosk_[a-f0-9]{64}$/);
    expect(first.token).not.toBe(second.token);
    expect(harness.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO kiosk_devices'),
      [
        first.id,
        'Entrada',
        crypto.createHash('sha256').update(first.token).digest('hex'),
        'admin-1'
      ]
    );
    expect(JSON.stringify(harness.query.mock.calls)).not.toContain(first.token);
  });
  it('rechaza cookies antiguas, de usuario, manipuladas y ausentes', async () => {
    expect(await verifyDeviceToken('eyJhbGciOiJIUzI1NiJ9.user.signature')).toBeNull();
    expect(await verifyDeviceToken(undefined)).toBeNull();
    expect(harness.query).not.toHaveBeenCalled();
    expect(await verifyDeviceToken(`kiosk_${'a'.repeat(64)}`)).toBeNull();
  });
  it('verifica vigencia y revocacion en cada peticion', async () => {
    harness.cookie = `kiosk_${'a'.repeat(64)}`;
    harness.query.mockResolvedValueOnce([{ id: 'device-1' }]);
    expect(await getKioskDevice()).toBe('device-1');
    expect(harness.query).toHaveBeenCalledWith(
      expect.stringContaining('revocado_en IS NULL AND expira_en > CURRENT_TIMESTAMP'),
      expect.any(Array)
    );
    expect(await getKioskDevice()).toBeNull();
  });
  it('renueva solo credenciales vigentes, sin reactivar revocadas ni vencidas', async () => {
    const token = `kiosk_${'b'.repeat(64)}`;
    harness.query.mockResolvedValueOnce([{ id: 'device-1' }]);
    expect(await renewDevice(token)).toBe('device-1');
    expect(harness.query).toHaveBeenCalledWith(
      expect.stringContaining("interval '30 days'"),
      expect.any(Array)
    );
    expect(await renewDevice(token)).toBeNull();
  });
  it('revoca la credencial anterior al volver a vincular un navegador', async () => {
    await provisionDevice('Entrada', 'admin-1', `kiosk_${'c'.repeat(64)}`);
    expect(harness.query.mock.calls[0][0]).toContain('SET revocado_en');
    expect(harness.query.mock.calls[1][0]).toContain('INSERT INTO kiosk_devices');
  });
  it('no lista hashes y persiste la revocacion', async () => {
    await listDevices();
    expect(harness.query.mock.calls[0][0]).not.toContain('token_hash');
    await revokeDevice('device-1');
    expect(harness.query).toHaveBeenLastCalledWith(expect.stringContaining('SET revocado_en'), [
      'device-1'
    ]);
  });
});
