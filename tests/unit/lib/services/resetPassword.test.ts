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
vi.mock('@/lib/transaction/contract', () => ({
  enUnaUnidad: (fn: any) => fn({ ejecutar: (work: any) => work({}) })
}));
vi.mock('@/lib/transaction/infrastructure', () => ({ resolverTransaccion: () => mocks.trx }));
vi.mock('@/modules/comunicaciones', () => ({ enviarWhatsApp: mocks.whatsapp }));

import { resetPassword } from '@/modules/identidad/autenticacion/consultas';

describe('recuperaci�n de administradores por WhatsApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hash.mockResolvedValue('hash-seguro');
    mocks.trx.mockResolvedValue([]);
    mocks.whatsapp.mockResolvedValue(true);
  });

  it('env�a una clave aleatoria al tel�fono del perfil y obliga a cambiarla', async () => {
    mocks.query.mockResolvedValue([{ id_usuario: 'u1', run: '12345678-9', telefono: '77712345' }]);
    const result = await resetPassword(' 12345678-9 ');
    expect(mocks.query.mock.calls[0][1]).toEqual(['12345678-9']);
    expect(mocks.query.mock.calls[0][0]).toContain("LOWER(r.nombre) = 'administrador'");
    const clave = mocks.hash.mock.calls[0][0];
    expect(clave).toMatch(/^[A-Za-z0-9_-]{24}$/);
    expect(clave).not.toBe('12345678-9');
    expect(mocks.whatsapp).toHaveBeenCalledWith('+59177712345', expect.stringContaining(clave));
    expect(mocks.trx).toHaveBeenCalledWith(expect.stringContaining('force_password_change = 1'), [
      'hash-seguro',
      '2026-10-11',
      'u1'
    ]);
    expect(mocks.trx).toHaveBeenCalledWith('DELETE FROM logins WHERE usuario_id = ?', ['u1']);
    expect(result.success).toBe(true);
    expect(JSON.stringify(result)).not.toContain(clave);
    expect(result).not.toHaveProperty('user');
  });

  it.each([null, '', 'abc'])(
    'no cambia credenciales sin un tel�fono v�lido: %s',
    async telefono => {
      mocks.query.mockResolvedValue([{ id_usuario: 'u1', run: '12345678-9', telefono }]);
      expect((await resetPassword('12345678-9')).success).toBe(true);
      expect(mocks.hash).not.toHaveBeenCalled();
      expect(mocks.trx).not.toHaveBeenCalled();
      expect(mocks.whatsapp).not.toHaveBeenCalled();
    }
  );

  it('no revela si el RUN corresponde a un administrador', async () => {
    mocks.query.mockResolvedValue([]);
    const noExiste = await resetPassword('12345678-9');
    mocks.query.mockResolvedValue([{ id_usuario: 'u1', telefono: null }]);
    expect(await resetPassword('12345678-9')).toEqual(noExiste);
    expect(mocks.trx).not.toHaveBeenCalled();
  });

  it.each(['rechazo', 'error'])('aborta la unidad de cambios si falla WhatsApp: %s', async tipo => {
    mocks.query.mockResolvedValue([{ id_usuario: 'u1', telefono: '+59177712345' }]);
    if (tipo === 'error') mocks.whatsapp.mockRejectedValue(new Error('Twilio no disponible'));
    else mocks.whatsapp.mockResolvedValue(false);
    await expect(resetPassword('12345678-9')).rejects.toThrow('No se pudo enviar el WhatsApp');
  });

  it('genera una clave distinta en cada recuperaci�n', async () => {
    mocks.query.mockResolvedValue([{ id_usuario: 'u1', telefono: '+59177712345' }]);
    await resetPassword('12345678-9');
    await resetPassword('12345678-9');
    expect(mocks.hash.mock.calls[0][0]).not.toBe(mocks.hash.mock.calls[1][0]);
  });
});
