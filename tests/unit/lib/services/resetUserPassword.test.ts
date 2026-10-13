import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ trx: vi.fn(), hash: vi.fn(), whatsapp: vi.fn() }));
vi.mock('@/lib/database/db', () => ({ query: vi.fn(), generateUUID: vi.fn() }));
vi.mock('argon2', () => ({ hash: mocks.hash }));
vi.mock('@/lib/auth/auth', () => ({ generateToken: vi.fn() }));
vi.mock('@/modules/identidad/autenticacion/sesionesRepositorio', () => ({
  registrarLogin: vi.fn()
}));
vi.mock('@/lib/business/timezoneService', () => ({
  getSystemTimezone: vi.fn(),
  getNowInBusinessTimezone: () => '2026-10-12'
}));
vi.mock('@/modules/auditoria', () => ({ SecurityAlertService: {} }));
vi.mock('@/lib/utils/logger', () => ({ default: { error: vi.fn() } }));
vi.mock('@/modules/identidad/autenticacion/codigos', () => ({ regenerateAttendanceCode: vi.fn() }));
vi.mock('@/lib/transaccion/contrato', () => ({
  enUnaUnidad: (fn: any) => fn({ ejecutar: (work: any) => work({}) })
}));
vi.mock('@/lib/transaccion/infraestructura', () => ({ resolverTransaccion: () => mocks.trx }));
vi.mock('@/modules/comunicaciones', () => ({ enviarWhatsApp: mocks.whatsapp }));
import { resetPassword } from '@/modules/identidad/autenticacion/consultas';

describe('reset de usuarios al RUT registrado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hash.mockResolvedValue('hash-rut');
    mocks.trx.mockResolvedValue([]);
  });
  it('restablece solo la cuenta indicada, fuerza cambio y cierra sus sesiones sin WhatsApp', async () => {
    mocks.trx.mockResolvedValueOnce([{ id_usuario: 'u2', run: '12345678-9' }]);
    const result = await resetPassword(' 12.345.678-9 ', 'usuarios');
    expect(mocks.trx.mock.calls[0][0]).toContain("NOT IN ('administrador', 'admin')");
    expect(mocks.trx.mock.calls[0][0]).toContain('FOR UPDATE OF u');
    expect(mocks.trx.mock.calls[0][1]).toEqual(['12.345.678-9']);
    expect(mocks.hash).toHaveBeenCalledWith('12345678-9');
    expect(mocks.trx).toHaveBeenCalledWith(expect.stringContaining('force_password_change = 1'), [
      'hash-rut',
      '2026-10-12',
      'u2'
    ]);
    expect(mocks.trx).toHaveBeenCalledWith('DELETE FROM logins WHERE usuario_id = ?', ['u2']);
    expect(mocks.whatsapp).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result).not.toHaveProperty('user');
  });
  it('no cambia contraseñas si no hay coincidencia o el RUT es ambiguo', async () => {
    const absent = await resetPassword('12345678-9', 'usuarios');
    mocks.trx.mockResolvedValueOnce([
      { id_usuario: 'u1', run: '12345678-9' },
      { id_usuario: 'u2', run: '12345678-9' }
    ]);
    expect(await resetPassword('12345678-9', 'usuarios')).toEqual(absent);
    expect(mocks.hash).not.toHaveBeenCalled();
    expect(mocks.trx.mock.calls.every(([sql]) => sql.startsWith('SELECT'))).toBe(true);
  });
});
