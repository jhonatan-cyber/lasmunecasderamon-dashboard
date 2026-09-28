// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ query: vi.fn() }));
const cache = vi.hoisted(() => ({ read: vi.fn(), set: vi.fn() }));

vi.mock('@/lib/database/db', () => ({ query: db.query }));
vi.mock('@/lib/auth/permissions-cache', () => ({ PermissionsCache: cache }));

import {
  createEmptyPermissions,
  getUserPermissionsFromDB,
  type UserPermissions
} from '@/lib/middleware/auth';

/** Pares `modulo.flag` concedidos, para comparar contra el vacío. */
const concedidos = (perms: UserPermissions): string[] =>
  Object.entries(perms).flatMap(([modulo, flags]) =>
    Object.entries(flags as Record<string, boolean>)
      .filter(([, concedido]) => concedido === true)
      .map(([flag]) => `${modulo}.${flag}`)
  );

/** Simula las dos consultas del resolver: rol del usuario y sus permisos. */
const stubQueries = (
  rolId: string | null | 'sin-usuario',
  permisos: Array<{ module: string; action: string }>
) => {
  db.query.mockImplementation(async (sql: string) => {
    if (/FROM usuarios/.test(sql))
      return rolId && rolId !== 'sin-usuario' ? [{ rol_id: rolId }] : [];
    if (/FROM permissions/.test(sql)) return permisos;
    throw new Error(`consulta inesperada: ${sql}`);
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  cache.read.mockResolvedValue(null);
});

describe('getUserPermissionsFromDB · cerrado por defecto', () => {
  it('un rol sin filas asignadas no concede nada', async () => {
    stubQueries('rol-vacio', []);

    const perms = await getUserPermissionsFromDB('user-1');

    expect(concedidos(perms)).toEqual([]);
    // Antes este caso devolvía la matriz hardcodeada del rol: sales.read,
    // categories.read y advances.read aparecían sin estar asignados.
    expect(perms.sales.read).toBe(false);
    expect(perms.categories.read).toBe(false);
    expect(perms.advances.read).toBe(false);
  });

  it('un usuario sin rol no concede nada y no consulta permisos', async () => {
    stubQueries(null, []);

    const perms = await getUserPermissionsFromDB('user-2');

    expect(concedidos(perms)).toEqual([]);
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it('un usuario inexistente no concede nada', async () => {
    stubQueries('sin-usuario', []);

    const perms = await getUserPermissionsFromDB('user-3');

    expect(concedidos(perms)).toEqual([]);
  });

  it('un error de base devuelve vacío y no lo cachea', async () => {
    db.query.mockRejectedValue(new Error('db down'));

    const perms = await getUserPermissionsFromDB('user-4');

    expect(concedidos(perms)).toEqual([]);
    expect(cache.set).not.toHaveBeenCalled();
  });
});

describe('getUserPermissionsFromDB · mapeo del catálogo', () => {
  it('traduce modulo+accion a los flags que usan las rutas', async () => {
    stubQueries('rol-1', [
      { module: 'clients', action: 'view' },
      { module: 'clients', action: 'view_details' },
      { module: 'products', action: 'return_container' },
      { module: 'cash_register', action: 'withdraw' },
      { module: 'cashregister', action: 'open' },
      { module: 'sales', action: 'delete' }
    ]);

    const perms = await getUserPermissionsFromDB('user-5');

    expect(perms.clients.read).toBe(true);
    expect(perms.products.return_container).toBe(true);
    expect(perms.finances.write).toBe(true);
    expect(perms.sales.delete).toBe(true);
    expect(perms.products.write).toBe(false);
  });

  it('las acciones de estado del catálogo conceden write del módulo', async () => {
    // Pares de la migración 036: la matriz no distingue "ocupar" de "editar", pero
    // las rutas que ejecutan esas operaciones exigen write del módulo.
    stubQueries('rol-1', [
      { module: 'rooms', action: 'occupy' },
      { module: 'products', action: 'deactivate' },
      { module: 'categories', action: 'activate' },
      { module: 'payroll', action: 'view_details' }
    ]);

    const perms = await getUserPermissionsFromDB('user-9');

    expect(perms.rooms.write).toBe(true);
    expect(perms.products.write).toBe(true);
    expect(perms.categories.write).toBe(true);
    expect(perms.payroll.read).toBe(true);
    // Ni de más: ocupar no concede ver ni borrar, y desactivar no borra.
    expect(perms.rooms.read).toBe(false);
    expect(perms.rooms.delete).toBe(false);
    expect(perms.products.delete).toBe(false);
  });

  it('create concede write pero NO el flag edit; edit colapsa a write igual', async () => {
    stubQueries('rol-1', [
      { module: 'gratificaciones', action: 'create' },
      { module: 'sales', action: 'edit' }
    ]);

    const perms = await getUserPermissionsFromDB('user-10');

    // El cajero solo solicita: create colapsa a write, el flag de edición no.
    expect(perms.gratificaciones.write).toBe(true);
    expect(perms.gratificaciones.edit).toBe(false);
    // `edit` colapsa a write en cualquier módulo…
    expect(perms.sales.write).toBe(true);
    // …y el flag homónimo solo existe si el módulo lo declara (sales no lo hace).
    expect((perms.sales as unknown as Record<string, boolean>).edit).toBeUndefined();
  });

  it('el par gratificaciones.edit concede su flag homónimo (habilita el PUT)', async () => {
    stubQueries('rol-1', [{ module: 'gratificaciones', action: 'edit' }]);

    const perms = await getUserPermissionsFromDB('user-11');

    expect(perms.gratificaciones.write).toBe(true);
    expect(perms.gratificaciones.edit).toBe(true);
  });

  it('materializa roles y descarta lo que la matriz no sabe expresar', async () => {
    stubQueries('rol-1', [
      // `roles` es módulo de la matriz desde que los handlers de /api/roles dejaron de
      // pedir users.*: roles.view concede roles.read.
      { module: 'roles', action: 'view' },
      // Sin flag propio en la matriz: la UI consulta roles.permissions sobre los
      // pares crudos del catálogo, no sobre estos flags.
      { module: 'roles', action: 'permissions' },
      { module: 'services', action: 'create' },
      { module: 'advances', action: 'approve' },
      { module: 'payroll', action: 'calculate' },
      { module: 'dashboard', action: 'view' }
    ]);

    const perms = await getUserPermissionsFromDB('user-6');

    expect(concedidos(perms)).toEqual(['roles.read', 'dashboard.read']);
  });

  it('cachea la matriz resuelta', async () => {
    stubQueries('rol-1', [{ module: 'dashboard', action: 'view' }]);

    const perms = await getUserPermissionsFromDB('user-7');

    expect(cache.set).toHaveBeenCalledWith('user-7', perms);
  });

  it('usa la caché cuando existe y no consulta la base', async () => {
    const cached = createEmptyPermissions();
    cached.clients.read = true;
    cache.read.mockResolvedValue(cached);

    const perms = await getUserPermissionsFromDB('user-8');

    expect(perms).toBe(cached);
    expect(db.query).not.toHaveBeenCalled();
  });
});

describe('createEmptyPermissions', () => {
  it('no concede ningún flag', () => {
    expect(concedidos(createEmptyPermissions())).toEqual([]);
  });

  it('devuelve una matriz nueva en cada llamada', () => {
    const a = createEmptyPermissions();
    a.clients.read = true;

    expect(createEmptyPermissions().clients.read).toBe(false);
  });
});
