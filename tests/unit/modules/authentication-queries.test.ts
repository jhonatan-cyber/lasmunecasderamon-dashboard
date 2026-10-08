// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as auth from '@/modules/identidad/autenticacion/consultas';
const mocks = vi.hoisted(() => ({ query: vi.fn(), verify: vi.fn(), hash: vi.fn(), token: vi.fn(), failed: vi.fn(), login: vi.fn(), regenerate: vi.fn(), now: '2026-01-01 21:30:00', user: {} as any, attendance: [] as any[], code: [] as any[] }));
vi.mock('@/lib/database/db', () => ({ query: mocks.query, generateUUID: () => 'generated' }));
vi.mock('argon2', () => ({ verify: mocks.verify, hash: mocks.hash }));
vi.mock('@/lib/auth/auth', () => ({ generateToken: mocks.token }));
vi.mock('@/modules/identidad/autenticacion/sesionesRepositorio', () => ({ registrarLogin: mocks.login }));
vi.mock('@/modules/identidad/autenticacion/codigos', () => ({ regenerateAttendanceCode: mocks.regenerate }));
vi.mock('@/modules/auditoria', () => ({ SecurityAlertService: { checkFailedLogin: mocks.failed } }));
vi.mock('@/lib/business/timezoneService', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/business/timezoneService')>(), getNowInBusinessTimezone: () => mocks.now }));
vi.mock('@/lib/utils/logger', () => { const logger = { error: vi.fn(), info: vi.fn(), captureException: vi.fn() }; return { default: logger, logger }; });
vi.mock('@/lib/transaccion/contrato', () => ({ enUnaUnidad: (fn: any) => fn({ ejecutar: (operation: any) => operation({}) }) }));
vi.mock('@/lib/transaccion/infraestructura', () => ({ resolverTransaccion: () => mocks.query }));
beforeEach(() => {
  vi.resetAllMocks(); mocks.now = '2026-01-01 21:30:00'; mocks.user = { id_usuario: 'u1', nombre: 'Ana', apellido: 'Pérez', nick: 'Ana', email: 'ana@example.com', rol_nombre: 'administrador', rol_id: 'r1', password: 'hash', force_password_change: 0 }; mocks.attendance = []; mocks.code = [];
  mocks.query.mockImplementation(async (sql: string) => { if (sql.includes('FROM usuarios u')) return mocks.user ? [mocks.user] : []; if (sql.includes('FROM asistencias')) return mocks.attendance; if (sql.includes('FROM codigos')) return mocks.code; return []; });
  mocks.verify.mockResolvedValue(true); mocks.hash.mockResolvedValue('hashed'); mocks.token.mockResolvedValue('token'); mocks.failed.mockResolvedValue({ blocked: false }); mocks.login.mockResolvedValue(undefined);
});
describe('autenticación y asistencia al ingresar', () => {
  it('exige credenciales, normaliza email y nick y conserva el cambio obligatorio de contraseña', async () => {
    await expect(auth.loginUser({})).rejects.toThrow('credenciales'); mocks.user.force_password_change = '1';
    const result = await auth.loginUser({ email: ' ana@example.com ', password: 'test-password' });
    expect(mocks.query.mock.calls[0][1]).toEqual(['ana@example.com', 'ana']); expect(result).toMatchObject({ success: true, token: 'token', user: { forcePasswordChange: true }, asistenciaRegistrada: false });
    expect((result as any).user.permissions.users.read).toBe(true);
  });
  it('rechaza usuarios desconocidos y registra el intento sin exponer credenciales', async () => {
    mocks.user = null; await expect(auth.loginUser({ email: 'missing', password: 'test' }, '127.0.0.1')).rejects.toThrow('Credenciales'); expect(mocks.failed).toHaveBeenCalledWith('missing', '127.0.0.1'); expect(mocks.verify).not.toHaveBeenCalled();
    mocks.failed.mockRejectedValue(new Error('alert offline')); await expect(auth.loginUser({ email: 'missing', password: 'test' }, '127.0.0.1')).rejects.toThrow('Credenciales');
  });
  it.each([false, true])('rechaza contraseña incorrecta y considera el bloqueo: %s', async blocked => {
    mocks.verify.mockResolvedValue(false); mocks.failed.mockResolvedValue({ blocked }); mocks.user.email = ''; mocks.user.nick = '';
    await expect(auth.loginUser({ email: 'ana', password: 'bad' }, '127.0.0.1')).rejects.toThrow(blocked ? 'bloqueada' : 'incorrecta'); expect(mocks.failed).toHaveBeenCalledWith('u1', '127.0.0.1');
  });
  it('rechaza contraseña incorrecta sin IP y conserva errores de infraestructura', async () => {
    mocks.verify.mockResolvedValue(false); await expect(auth.loginUser({ email: 'ana', password: 'bad' })).rejects.toThrow('incorrecta'); expect(mocks.failed).not.toHaveBeenCalled();
    mocks.query.mockRejectedValue(new Error('offline')); await expect(auth.loginUser({ email: 'ana', password: 'test' })).rejects.toThrow('Error al iniciar');
  });
  it('solicita código presencial y rechaza código inválido antes de abrir sesión', async () => {
    mocks.user.rol_nombre = 'garzon'; const result = await auth.loginUser({ email: 'ana', password: 'test' }); expect(result).toMatchObject({ requiereCodigo: true }); expect(mocks.login).not.toHaveBeenCalled();
    await expect(auth.loginUser({ email: 'ana', password: 'test', codigo: 'wrong' })).rejects.toThrow('Código');
  });
  it.each(['garzon', 'cajero'])('coordina marca presencial para %s en una unidad de trabajo', async role => {
    mocks.user.rol_nombre = role; mocks.code = [{ codigo: '1234' }]; const mark = vi.fn();
    const result = await auth.loginUser({ email: 'ana', password: 'test', ...(role === 'garzon' ? { codigo: '1234' } : {}) }, undefined, mark);
    expect(result).toMatchObject({ asistenciaRegistrada: true }); expect(mark).toHaveBeenCalledWith('u1', '2026-01-01', '21:30:00', expect.any(Object)); expect(mocks.regenerate).toHaveBeenCalledTimes(role === 'garzon' ? 1 : 0);
  });
  it('no duplica asistencia y requiere el coordinador cuando corresponde', async () => {
    mocks.user.rol_nombre = 'cajero'; await expect(auth.loginUser({ email: 'ana', password: 'test' })).rejects.toThrow('Error al iniciar');
    mocks.attendance = [{ id_asistencia: 'a1' }]; const result = await auth.loginUser({ email: 'ana', password: 'test', codigo: '1234' }); expect(result).toMatchObject({ asistenciaRegistrada: false });
  });
  it.each(['2026-01-01 20:00:00', '2026-01-01 23:30:00'])('fuera del turno el ticket sólo indica presencia: %s', async now => {
    mocks.now = now; mocks.user.rol_nombre = 'garzon'; await auth.loginUser({ email: 'ana', password: 'test', codigo: '1234' }); expect(mocks.query.mock.calls.some(([sql]) => sql.includes('UPDATE logins SET en_local'))).toBe(true); expect(mocks.regenerate).not.toHaveBeenCalled();
  });
  it('resuelve permisos de forma cerrada ante rol ausente, desconocido o error', async () => {
    expect((await auth.getUserPermissions('u1', '', '')).users.read).toBe(false);
    mocks.query.mockResolvedValue([]); expect((await auth.getUserPermissions('u1', 'r1')).users.read).toBe(false);
    mocks.query.mockResolvedValue([{ module: 'users', action: 'read' }, { module: 'unknown', action: 'write' }]); expect((await auth.getUserPermissions('u1', 'r1', 'garzon')).users.read).toBe(true);
    mocks.query.mockRejectedValue(new Error('offline')); expect((await auth.getUserPermissions('u1', 'r1')).users.read).toBe(false);
  });
  it('la sesión distingue usuario ausente, asistencia requerida y asistencia ya registrada', async () => {
    mocks.user = null; expect(await auth.checkSession('u1')).toMatchObject({ success: false });
    mocks.user = { id_usuario: 'u1', rol_nombre: 'garzon' }; expect(await auth.checkSession('u1')).toMatchObject({ debeDesconectar: true });
    mocks.attendance = [{}]; expect(await auth.checkSession('u1')).toMatchObject({ debeDesconectar: false });
    mocks.user.rol_nombre = undefined; expect(await auth.checkSession('u1')).toMatchObject({ debeDesconectar: false });
  });
});
describe('recuperación y administración de acceso', () => {
  it('recuperación exige usuario activo y RUN registrado y marca el cambio obligatorio', async () => {
    mocks.query.mockResolvedValue([]); await expect(auth.resetPassword('123')).rejects.toThrow('Usuario no encontrado');
    mocks.query.mockResolvedValue([{ run: '' }]); await expect(auth.resetPassword('123')).rejects.toThrow('RUN');
    mocks.query.mockResolvedValue([{ ...mocks.user, run: ' 12345678 ' }]); expect(await auth.resetPassword('12345678')).toMatchObject({ success: true }); expect(mocks.hash).toHaveBeenCalledWith('12345678'); expect(mocks.query).toHaveBeenLastCalledWith(expect.stringContaining('force_password_change = 1'), expect.arrayContaining(['hashed', 'u1']));
  });
  it.each([true, false])('primer administrador usa rol existente o crea uno: %s', async roleExists => {
    mocks.query.mockImplementation(async (sql: string) => sql.includes('COUNT(*)') ? [{ count: 0 }] : sql.includes('SELECT id_rol') ? roleExists ? [{ id_rol: 'r1' }] : [] : sql.includes('SELECT * FROM usuarios') ? [mocks.user] : []);
    const result = await auth.registerFirstUser({ nombre: 'Admin', apellido: 'Test', email: 'admin@example.com', password: ' test-password ', ci: '12345678' }); expect(result.success).toBe(true); expect(mocks.hash).toHaveBeenCalledWith('test-password'); expect(mocks.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO roles'))).toBe(!roleExists);
  });
  it('no crea administradores adicionales ni acepta una contraseña corta', async () => {
    mocks.query.mockResolvedValue([{ count: 1 }]); await expect(auth.registerFirstUser({ password: 'test-password' } as any)).rejects.toThrow('Ya existen'); mocks.query.mockResolvedValue([{ count: 0 }]); await expect(auth.registerFirstUser({ password: 'short' } as any)).rejects.toThrow('8 caracteres');
  });
  it.each(['activo', 'cerrado', 'otro'])('filtra logs sin interpolar datos: %s', async estado => {
    await auth.getAuthLogs({ estado, usuario_id: 'u1', fecha_inicio: '2026-01-01', fecha_fin: '2026-01-31' }); expect(mocks.query.mock.calls[0][1]).toEqual([estado === 'activo' ? 1 : estado === 'cerrado' ? 0 : 'otro', 'u1', '2026-01-01', '2026-01-31']); await auth.getAuthLogs({}); expect(mocks.query.mock.calls[1][1]).toEqual([]);
  });
  it('cierra sesiones y limpia sólo la bandera de cambio de contraseña', async () => {
    await auth.logoutUser('u1'); await auth.cerrarTodasSesiones(); expect(await auth.clearForcePasswordChange('u1')).toEqual({ success: true }); expect(mocks.query).toHaveBeenLastCalledWith(expect.stringContaining('force_password_change = 0'), expect.arrayContaining(['u1']));
  });
  it.each(['logoutUser', 'cerrarTodasSesiones', 'clearForcePasswordChange', 'checkUsersExist', 'checkSession', 'resetPassword', 'registerFirstUser', 'getAuthLogs'] as const)('propaga errores de base en %s', async method => {
    mocks.query.mockRejectedValue(new Error('offline')); await expect((auth[method] as any)(method === 'getAuthLogs' ? {} : 'u1')).rejects.toThrow('Error');
  });
});
