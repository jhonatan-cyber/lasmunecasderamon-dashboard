import { NextResponse } from 'next/server';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { query, withTransaction, generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { PermissionsCache } from '@/lib/auth/permissions-cache';
import { sendNotificationToAll } from '@/lib/api/sseService';

export const GET = withPublicRoute(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const roleId = (await params).id;

    const data = await query(
      `SELECT 
        p.id,
        p.name,
        p.description,
        p.module,
        p.action,
        p.created_at,
        p.updated_at,
        CASE WHEN rp.role_id IS NOT NULL THEN true ELSE false END AS assigned
      FROM permissions p
      LEFT JOIN role_permissions rp
        ON rp.permission_id = p.id
       AND rp.role_id = ?
      WHERE p.deleted_at IS NULL
      ORDER BY p.module ASC, p.action ASC`,
      [roleId]
    );

    return NextResponse.json({ success: true, data });
  }
);

export const PUT = withRoute(
  { auth: true, audit: true, module: 'roles', action: 'write' },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const roleId = (await params).id;
    const body = await request.json();
    const permissionIds = Array.isArray(body?.permissions) ? body.permissions : [];
    // El índice único (role_id, permission_id) convierte un id repetido en un 500.
    const uniquePermissionIds = [...new Set(permissionIds.map((id: unknown) => String(id)))];

    // Los usuarios del rol son los que quedan con la matriz vieja en caché.
    const roleUsers = await query<Array<{ id_usuario: string }>>(
      'SELECT id_usuario FROM usuarios WHERE rol_id = ?',
      [roleId]
    );

    await withTransaction(async trx => {
      await trx('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

      for (const permissionId of uniquePermissionIds) {
        // role_permissions no tiene defaults: id y created_at son NOT NULL y hay que
        // enviarlos explícitamente (mismo patrón que /api/permissions/setup-cajero).
        await trx(
          `INSERT INTO role_permissions (id, role_id, permission_id, created_at)
           VALUES (?, ?, ?, ?)`,
          [generateUUID(), roleId, permissionId, getNowInBusinessTimezone()]
        );
      }
    });

    // Después del commit: invalidar antes de confirmar dejaría que otro request
    // repoblara la caché con la matriz anterior y la mantuviera viva 60s.
    await Promise.all(
      (roleUsers ?? []).map(user => PermissionsCache.invalidate(String(user.id_usuario)))
    );

    // Es el flujo principal de edición de permisos: quien tenga este rol debe
    // refrescar su caché para operar con la matriz nueva.
    sendNotificationToAll('permissions-updated', { roleId });

    return NextResponse.json({ success: true, message: 'Permisos del rol actualizados' });
  }
);
