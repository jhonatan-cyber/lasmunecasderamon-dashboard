import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const userResult = await query<any[]>(`
      SELECT rol_id FROM usuarios WHERE id_usuario = ?
    `, [id]);

    if (!userResult || userResult.length === 0 || !userResult[0].rol_id) {
      return NextResponse.json({ success: true, data: [] });
    }

    const roleId = userResult[0].rol_id;

    // Obtener los permisos del rol del usuario
    const permissions = await query<any[]>(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.module,
        p.action
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ? AND p.deleted_at IS NULL
    `, [roleId]);

    return NextResponse.json({ success: true, data: permissions });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
