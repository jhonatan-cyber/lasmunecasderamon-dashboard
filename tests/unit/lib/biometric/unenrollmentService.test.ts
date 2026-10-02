// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  transaction: vi.fn(),
  trx: vi.fn(),
  user: vi.fn(),
  credentials: vi.fn(),
  present: vi.fn(),
  remove: vi.fn(),
  cgi: vi.fn()
}));
vi.mock('@/lib/database/db', () => ({ query: mocks.query, withTransaction: mocks.transaction }));
vi.mock('@/lib/repositories/UserRepository', () => ({ UserRepository: { getById: mocks.user } }));
vi.mock('@/lib/biometric/deviceClient', () => ({
  credencialesDeFila: mocks.credentials,
  eliminarUsuarioDelEquipo: mocks.cgi
}));
vi.mock('@/lib/biometric/faceSdk', () => ({
  personaEnEquipo: mocks.present,
  eliminarPersonaEnEquipo: mocks.remove
}));

import { desenrolarUsuario } from '@/lib/biometric/unenrollmentService';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ biometrico_codigo: '1001' });
  mocks.query.mockImplementation(async (sql: string) =>
    sql.includes('SELECT') ? [{ id: 'door', nombre: 'Puerta' }] : []
  );
  mocks.credentials.mockReturnValue({ ip: 'test' });
  mocks.present.mockResolvedValue(false);
  mocks.remove.mockResolvedValue(true);
  mocks.cgi.mockResolvedValue(undefined);
  mocks.transaction.mockImplementation(callback => callback(mocks.trx));
});

describe('desenrolarUsuario', () => {
  it('elimina plantillas y desactiva modalidades sin contactar al lector', async () => {
    expect((await desenrolarUsuario('user')).ok).toBe(true);
    expect(mocks.trx).toHaveBeenCalledWith(
      'DELETE FROM biometric_plantillas WHERE usuario_id = ?',
      ['user']
    );
    expect(mocks.trx).toHaveBeenCalledWith(
      'UPDATE usuarios SET biometrico_facial = 0, biometrico_huella = 0 WHERE id_usuario = ?',
      ['user']
    );
    expect(mocks.present).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.cgi).not.toHaveBeenCalled();
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it('permite desenrolar sin codigo del lector', async () => {
    mocks.user.mockResolvedValue({ biometrico_codigo: null });
    expect((await desenrolarUsuario('user')).ok).toBe(true);
  });
  it('propaga errores de la transaccion sin informar exito', async () => {
    mocks.transaction.mockRejectedValue(new Error('database unavailable'));
    await expect(desenrolarUsuario('user')).rejects.toThrow('database unavailable');
  });
  it('rechaza usuarios inexistentes', async () => {
    mocks.user.mockResolvedValue(null);
    await expect(desenrolarUsuario('missing')).rejects.toThrow();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
