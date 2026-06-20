import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { query } from '@/lib/database/db';

export const GET = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const userResult = await query<any[]>(
      `
      SELECT rol_id FROM usuarios WHERE id_usuario = ?
    `,
      [id]
    );

    if (!userResult || userResult.length === 0 || !userResult[0].rol_id) {
      return NextResponse.json({ success: true, data: [] });
    }

    const roleId = userResult[0].rol_id;

    const permissions = await query<any[]>(
      `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.module,
        p.action
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ? AND p.deleted_at IS NULL
    `,
      [roleId]
    );

    return NextResponse.json({ success: true, data: permissions });
  }
);
