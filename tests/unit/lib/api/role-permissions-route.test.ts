// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-validation';
});

const db = vi.hoisted(() => ({ query: vi.fn(), withTransaction: vi.fn() }));
const permissionsCache = vi.hoisted(() => ({ invalidate: vi.fn(), clear: vi.fn() }));
const sse = vi.hoisted(() => ({ sendNotificationToAll: vi.fn() }));
const uuid = vi.hoisted(() => {
  let count = 0;
  return { next: () => `generated-uuid-${++count}` };
});

let mockAuthUser: any = {
  id: 'admin-1',
  role: 'administrador',
  permissions: {}
};

vi.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) }
}));

vi.mock('@/lib/api/date-response', () => ({ normalizeJsonResponseDates: (r: any) => r }));

vi.mock('@/lib/auth/auth-app', () => ({
  getAuth: vi.fn().mockImplementation(async () => mockAuthUser)
}));

vi.mock('@/modules/auditoria/registro/servicio', () => ({
  AuditService: { log: vi.fn().mockResolvedValue(undefined) }
}));

vi.mock('@/modules/auditoria/errores/servicio', () => ({
  ErrorLogService: { log: vi.fn().mockResolvedValue(undefined) }
}));

vi.mock('@/lib/utils/logger', () => {
  const mocks = {
    error: vi.fn(),
    captureException: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  };
  return { logger: mocks, default: mocks };
});

vi.mock('@/lib/database/db', () => ({
  query: db.query,
  withTransaction: db.withTransaction,
  generateUUID: uuid.next
}));

vi.mock('@/lib/auth/permissions-cache', () => ({ PermissionsCache: permissionsCache }));

vi.mock('@/lib/api/sseService', () => ({
  sendNotificationToAll: sse.sendNotificationToAll
}));

import { PUT } from '@/app/api/roles/[id]/permissions/route';

const ROLE_ID = '3c4ae24a-700a-436d-8bb8-d44e6d45b007';
const OTHER_ROLE_ID = '9f3b1c2d-4a5e-4f6b-8c7d-0000000000b1';

const trx = vi.fn();

const callPut = (body: unknown, roleId: string = ROLE_ID) =>
  PUT(
    new Request(`http://localhost/api/roles/${roleId}/permissions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }),
    { params: Promise.resolve({ id: roleId }) }
  );

const inserts = () => trx.mock.calls.filter(([sql]) => /INSERT INTO role_permissions/.test(sql));
const deletes = () => trx.mock.calls.filter(([sql]) => /DELETE FROM role_permissions/.test(sql));

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthUser = { id: 'admin-1', role: 'administrador', permissions: {} };
  trx.mockReset().mockResolvedValue([]);
  db.withTransaction.mockImplementation(async (callback: any) => callback(trx));
  db.query.mockResolvedValue([]);
  permissionsCache.invalidate.mockResolvedValue(undefined);
});

describe('PUT /api/roles/[id]/permissions', () => {
  it('inserta id y created_at en cada fila (la tabla no tiene defaults)', async () => {
    const res = await callPut({ permissions: ['perm-1', 'perm-2'] });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, message: 'Permisos del rol actualizados' });

    const rows = inserts();
    expect(rows).toHaveLength(2);

    for (const [sql, params] of rows) {
      // El INSERT anterior omitía id/created_at y la transacción fallaba con
      // "el valor nulo en la columna «id» viola la restricción not-null".
      expect(sql).toMatch(
        /INSERT INTO role_permissions \(id, role_id, permission_id, created_at\)/
      );
      expect(params).toHaveLength(4);
      expect(params[0]).toMatch(/^generated-uuid-\d+$/);
      expect(params[3]).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    }

    expect(rows.map(([, params]) => params[2])).toEqual(['perm-1', 'perm-2']);
    expect(rows.every(([, params]) => params[1] === ROLE_ID)).toBe(true);

    // Cada fila con su propio id: dos inserts con el mismo id romperían la PK.
    const ids = rows.map(([, params]) => params[0]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('reemplaza el set anterior antes de insertar', async () => {
    await callPut({ permissions: ['perm-1'] });

    expect(deletes()).toHaveLength(1);
    expect(deletes()[0][1]).toEqual([ROLE_ID]);

    const deleteOrder = trx.mock.invocationCallOrder[0];
    const insertOrder = trx.mock.invocationCallOrder[1];
    expect(deleteOrder).toBeLessThan(insertOrder);
  });

  it('descarta ids repetidos: el índice único (role_id, permission_id) daría 500', async () => {
    await callPut({ permissions: ['perm-1', 'perm-1', 'perm-2'] });

    expect(inserts().map(([, params]) => params[2])).toEqual(['perm-1', 'perm-2']);
  });

  it('acepta una lista vacía: el rol queda sin permisos', async () => {
    const res = await callPut({ permissions: [] });

    expect(res.status).toBe(200);
    expect(deletes()).toHaveLength(1);
    expect(inserts()).toHaveLength(0);
  });

  it('sin lista de permisos no inventa filas', async () => {
    const res = await callPut({});

    expect(res.status).toBe(200);
    expect(inserts()).toHaveLength(0);
  });

  it('invalida la caché de los usuarios del rol después del commit', async () => {
    db.query.mockResolvedValue([{ id_usuario: 'user-1' }, { id_usuario: 'user-2' }]);

    await callPut({ permissions: ['perm-1'] });

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FROM usuarios'), [ROLE_ID]);
    expect(permissionsCache.invalidate).toHaveBeenCalledTimes(2);
    expect(permissionsCache.invalidate).toHaveBeenCalledWith('user-1');
    expect(permissionsCache.invalidate).toHaveBeenCalledWith('user-2');

    // Invalidar antes del commit dejaría que otro request repoblara la caché con
    // la matriz vieja y la mantuviera vigente el TTL completo.
    expect(db.withTransaction.mock.invocationCallOrder[0]).toBeLessThan(
      permissionsCache.invalidate.mock.invocationCallOrder[0]
    );
  });

  it('no invalida nada si la transacción falla (nada cambió)', async () => {
    db.query.mockResolvedValue([{ id_usuario: 'user-1' }]);
    db.withTransaction.mockRejectedValueOnce(new Error('boom'));

    const res = await callPut({ permissions: ['perm-1'] });

    expect(res.status).toBe(500);
    expect(permissionsCache.invalidate).not.toHaveBeenCalled();
    expect(sse.sendNotificationToAll).not.toHaveBeenCalled();
  });

  it('avisa por SSE a los clientes con el rol afectado', async () => {
    await callPut({ permissions: ['perm-1'] });

    expect(sse.sendNotificationToAll).toHaveBeenCalledWith('permissions-updated', {
      roleId: ROLE_ID
    });
  });

  it('opera sobre el rol de la URL, no sobre otro', async () => {
    db.query.mockResolvedValue([{ id_usuario: 'user-9' }]);

    await callPut({ permissions: ['perm-1'] }, OTHER_ROLE_ID);

    expect(deletes()[0][1]).toEqual([OTHER_ROLE_ID]);
    expect(inserts()[0][1][1]).toBe(OTHER_ROLE_ID);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FROM usuarios'), [
      OTHER_ROLE_ID
    ]);
  });

  it('exige roles.write: users.write (que el cajero sí tiene) no alcanza', async () => {
    mockAuthUser = {
      id: 'user-2',
      role: 'cajero',
      // El cajero tiene los pares users.* completos: desde que el handler se alineó
      // con el gate del middleware (roles.*), eso ya no alcanza para tocar permisos.
      permissions: {
        users: { read: true, write: true, delete: true },
        roles: { read: true, write: false, delete: false }
      }
    };

    const res = await callPut({ permissions: ['perm-1'] });

    expect(res.status).toBe(403);
    expect(db.withTransaction).not.toHaveBeenCalled();
    expect(permissionsCache.invalidate).not.toHaveBeenCalled();
  });

  it('con roles.write sí opera (roles.edit/activate del catálogo conceden write)', async () => {
    mockAuthUser = {
      id: 'user-3',
      role: 'gerente',
      permissions: { roles: { read: true, write: true, delete: false } }
    };

    const res = await callPut({ permissions: ['perm-1'] });

    expect(res.status).toBe(200);
    expect(db.withTransaction).toHaveBeenCalled();
  });
});
