import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => vi.fn());
vi.mock('@/lib/database/db', () => ({ query }));

import { verificarPermisoUsuario } from '@/modules/identidad/authorization';

describe('verificarPermisoUsuario', () => {
  beforeEach(() => vi.clearAllMocks());

  it('permite administradores con una sola lectura del usuario', async () => {
    query.mockResolvedValueOnce([{ rol_id: 'role-admin', rol_nombre: 'Administrador' }]);

    await expect(verificarPermisoUsuario('user-1', 'products', 'view')).resolves.toBe(true);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('deniega usuario inexistente, sin rol o sin el permiso exacto', async () => {
    query.mockResolvedValueOnce([]);
    await expect(verificarPermisoUsuario('missing', 'products', 'view')).resolves.toBe(false);

    query.mockResolvedValueOnce([{ rol_id: null, rol_nombre: null }]);
    await expect(verificarPermisoUsuario('user-2', 'products', 'view')).resolves.toBe(false);

    query
      .mockResolvedValueOnce([{ rol_id: 'role-1', rol_nombre: 'cajero' }])
      .mockResolvedValueOnce([]);
    await expect(verificarPermisoUsuario('user-3', 'products', 'view')).resolves.toBe(false);
    expect(query).toHaveBeenCalledTimes(4);
  });

  it('permite solo un par módulo/acción asignado y vigente', async () => {
    query
      .mockResolvedValueOnce([{ rol_id: 'role-1', rol_nombre: 'cajero' }])
      .mockResolvedValueOnce([{ existe: 1 }]);

    await expect(verificarPermisoUsuario('user-4', 'products', 'view')).resolves.toBe(true);
    expect(query).toHaveBeenLastCalledWith(expect.stringContaining('p.deleted_at IS NULL'), [
      'role-1',
      'products',
      'view'
    ]);
  });
});
