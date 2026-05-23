import { NextResponse } from 'next/server';
import { withAppApiWrapper, withAppAuth } from '@/lib/api/app-api-wrapper';
import { query, withTransaction } from '@/lib/database/db';

export const GET = withAppApiWrapper(
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

export const PUT = withAppAuth(
  async (request: Request, { params }: { params: Promise<{ id: string }>; user: any }) => {
    const roleId = (await params).id;
    const body = await request.json();
    const permissionIds = Array.isArray(body?.permissions) ? body.permissions : [];

    await withTransaction(async trx => {
      await trx('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

      for (const permissionId of permissionIds) {
        await trx(
          `INSERT INTO role_permissions (role_id, permission_id)
           VALUES (?, ?)`,
          [roleId, String(permissionId)]
        );
      }
    });

    return NextResponse.json({ success: true, message: 'Permisos del rol actualizados' });
  }
);
