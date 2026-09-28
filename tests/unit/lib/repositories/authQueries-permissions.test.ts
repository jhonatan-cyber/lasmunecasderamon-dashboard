// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ query: vi.fn() }));
const logger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  captureException: vi.fn()
}));

vi.mock('@/lib/database/db', () => ({ query: db.query, generateUUID: () => 'uuid' }));
vi.mock('@/lib/utils/logger', () => ({ logger, default: logger }));
vi.mock('argon2', () => ({ hash: vi.fn(), verify: vi.fn(), argon2id: 2 }));
vi.mock('@/lib/auth/auth', () => ({ generateToken: vi.fn(), registrarLogin: vi.fn() }));

import { getUserPermissions } from '@/lib/repositories/auth/AuthQueries';
import { type UserPermissions } from '@/lib/middleware/auth';

const concedidos = (perms: UserPermissions): string[] =>
  Object.entries(perms).flatMap(([modulo, flags]) =>
    Object.entries(flags as Record<string, boolean>)
      .filter(([, concedido]) => concedido === true)
      .map(([flag]) => `${modulo}.${flag}`)
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AuthQueries.getUserPermissions · cerrado por defecto', () => {
  it('sin rol asignado no concede nada', async () => {
    const perms = await getUserPermissions('user-1', '' as unknown as number, 'garzon');

    expect(concedidos(perms)).toEqual([]);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('un rol sin filas no concede nada (antes caía en la matriz de administrador)', async () => {
    db.query.mockResolvedValue([]);

    const perms = await getUserPermissions('user-2', 7, 'rol-nuevo');

    expect(concedidos(perms)).toEqual([]);
    expect(perms.settings.write).toBe(false);
    expect(logger.info).toHaveBeenCalled();
  });

  it('un error de base no concede nada', async () => {
    db.query.mockRejectedValue(new Error('db down'));

    const perms = await getUserPermissions('user-3', 8, 'cajero');

    expect(concedidos(perms)).toEqual([]);
    expect(logger.captureException).toHaveBeenCalled();
  });

  it('un rol sin nombre usa la base en vez de asumir administrador', async () => {
    db.query.mockResolvedValue([{ module: 'dashboard', action: 'view' }]);

    const perms = await getUserPermissions('user-4', 9);

    expect(db.query).toHaveBeenCalledTimes(1);
    expect(concedidos(perms)).toEqual(['dashboard.read']);
  });
});

describe('AuthQueries.getUserPermissions · mapeo', () => {
  it('traduce el catálogo a flags con la traducción compartida', async () => {
    db.query.mockResolvedValue([
      { module: 'clients', action: 'view' },
      { module: 'cash_register', action: 'close' },
      { module: 'roles', action: 'view' }
    ]);

    const perms = await getUserPermissions('user-5', 10, 'cajero');

    expect(perms.clients.read).toBe(true);
    // `cash_register` vive como `finances` en la matriz (traducción compartida con
    // lib/middleware/auth; antes cada copia tenía su propia lista de alias).
    expect(perms.finances.write).toBe(true);
    // `roles` es módulo de la matriz: es lo que verifican los handlers de /api/roles
    // (antes se descartaba y esos handlers tenían que pedir users.*).
    expect(perms.roles.read).toBe(true);
  });

  it('los flags homónimos del catálogo también se conceden (gratificaciones.edit)', async () => {
    db.query.mockResolvedValue([{ module: 'gratificaciones', action: 'create' }]);
    const soloCreate = await getUserPermissions('user-7', 12, 'cajero');
    // create colapsa a write: da de editar a cualquiera que solo sepa solicitar…
    expect(soloCreate.gratificaciones.write).toBe(true);
    expect(soloCreate.gratificaciones.edit).toBe(false);

    db.query.mockResolvedValue([{ module: 'gratificaciones', action: 'edit' }]);
    const conEdit = await getUserPermissions('user-8', 13, 'gerente');
    // …mientras que el par edit además enciende su flag homónimo.
    expect(conEdit.gratificaciones.write).toBe(true);
    expect(conEdit.gratificaciones.edit).toBe(true);
  });

  it('los alias zombis del catálogo no conceden nada', async () => {
    // `habitaciones` no existe en el catálogo (solo `rooms.*`) y no está en la
    // traducción compartida: si una fila lo trajera, se descarta como cualquier
    // módulo que la matriz no conoce.
    db.query.mockResolvedValue([{ module: 'habitaciones', action: 'view' }]);

    const perms = await getUserPermissions('user-6', 11, 'cajero');

    expect(concedidos(perms)).toEqual([]);
  });

  it('el administrador no consulta la base', async () => {
    const perms = await getUserPermissions('admin-1', 1, 'Administrador');

    expect(db.query).not.toHaveBeenCalled();
    expect(perms.users.delete).toBe(true);
    expect(perms.settings.write).toBe(true);
  });
});
