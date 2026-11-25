import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  obtenerCodigoActual: vi.fn(),
  reemplazarCodigoActual: vi.fn(),
  notify: vi.fn()
}));
vi.mock('@/lib/database/db', () => ({ generateUUID: () => 'test-code-id' }));
vi.mock('@/modules/identidad/autenticacion/codigos/repositorio', () => ({
  obtenerCodigoActual: mocks.obtenerCodigoActual,
  reemplazarCodigoActual: mocks.reemplazarCodigoActual
}));
vi.mock('@/lib/utils/logger', () => ({
  logger: { error: vi.fn() },
  setRequestId: vi.fn(),
  getRequestId: vi.fn(() => 'test-request-id'),
  clearRequestId: vi.fn()
}));
vi.mock('@/lib/utils/codeUtils', () => ({ generateRandomCode4: () => '4821' }));
vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-10-07 12:00:00'
}));
vi.mock('@/lib/api/sseService', () => ({ sendNotificationToAll: mocks.notify }));
import { getOrCreateAttendanceCode } from '@/modules/identidad/autenticacion/codigos';

beforeEach(() => {
  vi.clearAllMocks();
});
describe('attendance code in a fresh database', () => {
  it('creates the first code and publishes it after persistence', async () => {
    mocks.obtenerCodigoActual.mockResolvedValue([]);
    expect(await getOrCreateAttendanceCode()).toBe('4821');
    expect(mocks.reemplazarCodigoActual).toHaveBeenCalledWith({
      id: 'test-code-id',
      codigo: '4821',
      fecha: '2026-10-07 12:00:00'
    });
    expect(mocks.notify).toHaveBeenCalledWith('code_changed', { codigo: '4821' });
  });
  it('keeps the existing valid code without rotating it', async () => {
    mocks.obtenerCodigoActual.mockResolvedValue([{ codigo: '5932' }]);
    expect(await getOrCreateAttendanceCode()).toBe('5932');
    expect(mocks.obtenerCodigoActual).toHaveBeenCalledTimes(1);
    expect(mocks.reemplazarCodigoActual).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });
});
