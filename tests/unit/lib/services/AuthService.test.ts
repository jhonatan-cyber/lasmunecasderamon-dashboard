import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUserPermissions: vi.fn(),
  loginUser: vi.fn(),
  logoutUser: vi.fn(),
  resetPassword: vi.fn(),
  cerrarTodasSesiones: vi.fn(),
  getAuthLogs: vi.fn(),
  checkUsersExist: vi.fn(),
  registerFirstUser: vi.fn(),
  checkSession: vi.fn(),
  getSystemDateTime: vi.fn(),
  clearForcePasswordChange: vi.fn()
}));

vi.mock('@/lib/repositories/auth/AuthQueries', () => mocks);

import { AuthService } from '@/lib/services/AuthService';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AuthService — delegación a AuthRepository/AuthQueries', () => {
  it('login delega credenciales e ip sin transformar', async () => {
    const credentials = { email: 'admin@test.com', password: 'secret123' };
    mocks.loginUser.mockResolvedValue({ success: true, token: 'jwt', user: { id: 1 } });

    const result = await AuthService.login(credentials, '10.0.0.1');

    expect(mocks.loginUser).toHaveBeenCalledWith(credentials, '10.0.0.1');
    expect(result).toEqual({ success: true, token: 'jwt', user: { id: 1 } });
  });

  it('login con codigo delega igual', async () => {
    const credentials = { email: 'admin@test.com', password: 'x', codigo: '1234' };
    mocks.loginUser.mockResolvedValue({ success: true });

    await AuthService.login(credentials, '127.0.0.1');

    expect(mocks.loginUser).toHaveBeenCalledWith(credentials, '127.0.0.1');
  });

  it('logout delega el userId', async () => {
    mocks.logoutUser.mockResolvedValue(undefined);

    await AuthService.logout('user-42');

    expect(mocks.logoutUser).toHaveBeenCalledWith('user-42');
  });

  it('getUserPermissions delega userId, roleId y roleName', async () => {
    const perms = { sales: { read: true } };
    mocks.getUserPermissions.mockResolvedValue(perms);

    const result = await AuthService.getUserPermissions('7', 3, 'cajero');

    expect(mocks.getUserPermissions).toHaveBeenCalledWith('7', 3, 'cajero');
    expect(result).toEqual(perms);
  });

  it('checkUsers delega y devuelve booleano', async () => {
    mocks.checkUsersExist.mockResolvedValue(true);

    const hasUsers = await AuthService.checkUsers();

    expect(mocks.checkUsersExist).toHaveBeenCalled();
    expect(hasUsers).toBe(true);
  });

  it('registerFirstUser delega payload de primer administrador', async () => {
    const body = {
      nombre: 'Admin',
      apellido: 'Principal',
      email: 'admin@test.com',
      password: 'x'.repeat(10),
      ci: '12345678-9'
    };
    mocks.registerFirstUser.mockResolvedValue({ success: true });

    await AuthService.registerFirstUser(body);

    expect(mocks.registerFirstUser).toHaveBeenCalledWith(body);
  });

  it('checkSession delega userId', async () => {
    mocks.checkSession.mockResolvedValue({ debeDesconectar: false });

    const result = await AuthService.checkSession('user-1');

    expect(mocks.checkSession).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ debeDesconectar: false });
  });

  it('resetPassword delega solo el run (el repo hashea y fuerza cambio)', async () => {
    mocks.resetPassword.mockResolvedValue({ success: true });

    await AuthService.resetPassword('12345678-9');

    expect(mocks.resetPassword).toHaveBeenCalledWith('12345678-9');
  });

  it('cerrarSesiones cierra todas las sesiones sin argumentos', async () => {
    mocks.cerrarTodasSesiones.mockResolvedValue(undefined);

    await AuthService.cerrarSesiones();

    expect(mocks.cerrarTodasSesiones).toHaveBeenCalled();
  });

  it('getLogs delega filtros de auditoría tipados', async () => {
    const filters = { estado: 'activo', usuario_id: 'user-1' };
    mocks.getAuthLogs.mockResolvedValue([]);

    await AuthService.getLogs(filters);

    expect(mocks.getAuthLogs).toHaveBeenCalledWith(filters);
  });

  it('getSystemDateTime no transforma el resultado', async () => {
    const dt = { fecha: '2026-09-24', hora: '10:00:00' };
    mocks.getSystemDateTime.mockResolvedValue(dt);

    await expect(AuthService.getSystemDateTime()).resolves.toEqual(dt);
  });

  it('clearForcePasswordChange delega userId', async () => {
    mocks.clearForcePasswordChange.mockResolvedValue(undefined);

    await AuthService.clearForcePasswordChange('user-1');

    expect(mocks.clearForcePasswordChange).toHaveBeenCalledWith('user-1');
  });

  it('propaga errores del repositorio sin capturarlos', async () => {
    mocks.loginUser.mockRejectedValue(new Error('credenciales inválidas'));

    await expect(AuthService.login({ email: 'x@test.com', password: 'y' }, 'ip')).rejects.toThrow(
      'credenciales inválidas'
    );
  });

  it('expone todos los métodos estáticos esperados', () => {
    const methods = [
      'getUserPermissions',
      'login',
      'logout',
      'resetPassword',
      'cerrarSesiones',
      'getLogs',
      'checkUsers',
      'registerFirstUser',
      'checkSession',
      'getSystemDateTime',
      'clearForcePasswordChange'
    ] as const;

    for (const m of methods) {
      expect(typeof AuthService[m]).toBe('function');
    }
  });
});
