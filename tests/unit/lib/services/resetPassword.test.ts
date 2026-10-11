import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  trx: vi.fn(),
  hash: vi.fn(),
  whatsapp: vi.fn()
}));
vi.mock('@/lib/database/db', () => ({ query: mocks.query, generateUUID: vi.fn() }));
vi.mock('argon2', () => ({ hash: mocks.hash }));
vi.mock('@/lib/auth/auth', () => ({ generateToken: vi.fn() }));
vi.mock('@/modules/identidad/autenticacion/sesionesRepositorio', () => ({
  registrarLogin: vi.fn()
}));
vi.mock('@/lib/business/timezoneService', () => ({
  getSystemTimezone: vi.fn(),
  getNowInBusinessTimezone: () => '2026-10-11'
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

describe('recuperacion por RUT', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hash.mockResolvedValue('hash-seguro');
    mocks.trx.mockResolvedValue([]);
  });

  it('funciona sin telefono, hashea el RUT registrado y revoca sesiones', async () => {
    mocks.query.mockResolvedValue([{ id_usuario: 'u1', run: '12345678-9', telefono: null }]);
    const result = await resetPassword(' 12345678-9 ');
    expect(mocks.query.mock.calls[0][1]).toEqual(['12345678-9']);
    expect(mocks.hash).toHaveBeenCalledWith('12345678-9');
    expect(mocks.trx).toHaveBeenCalledWith(expect.stringContaining('force_password_change = 1'), [
      'hash-seguro',
      '2026-10-11',
      'u1'
    ]);
    expect(mocks.trx).toHaveBeenCalledWith('DELETE FROM logins WHERE usuario_id = ?', ['u1']);
    expect(mocks.whatsapp).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.message).toContain('RUT');
  });

  it('no modifica credenciales si el usuario no existe', async () => {
    mocks.query.mockResolvedValue([]);
    await expect(resetPassword('12345678-9')).rejects.toThrow('Usuario no encontrado');
    expect(mocks.hash).not.toHaveBeenCalled();
    expect(mocks.trx).not.toHaveBeenCalled();
  });
});
