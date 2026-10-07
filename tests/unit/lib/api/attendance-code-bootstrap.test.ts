import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), notify: vi.fn() }));
vi.mock('@/lib/database/db', () => ({ query: mocks.query, generateUUID: () => 'test-code-id' }));
vi.mock('@/lib/utils/logger', () => ({ logger: { error: vi.fn() } }));
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
    mocks.query.mockResolvedValueOnce([]).mockResolvedValue([]);
    expect(await getOrCreateAttendanceCode()).toBe('4821');
    expect(mocks.query).toHaveBeenLastCalledWith(
      'INSERT INTO codigos (id_codigo, codigo, fecha_crea, estado) VALUES (?, ?, ?, 1)',
      ['test-code-id', '4821', '2026-10-07 12:00:00']
    );
    expect(mocks.notify).toHaveBeenCalledWith('code_changed', { codigo: '4821' });
  });
  it('keeps the existing valid code without rotating it', async () => {
    mocks.query.mockResolvedValueOnce([{ codigo: '5932' }]);
    expect(await getOrCreateAttendanceCode()).toBe('5932');
    expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(mocks.notify).not.toHaveBeenCalled();
  });
});
