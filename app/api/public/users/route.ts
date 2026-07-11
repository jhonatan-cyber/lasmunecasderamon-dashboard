import { NextResponse } from 'next/server';
import { query } from '@/lib/database/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await query<any[]>(`
      SELECT u.id_usuario as id, u.nombre, u.apellido, u.nick, u.foto, u.qr_token, r.nombre as role
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id_rol
      WHERE u.estado = 1 AND (r.nombre IS NULL OR LOWER(r.nombre) <> 'administrador')
      ORDER BY u.nombre ASC, u.apellido ASC
    `);

    const users = rows.map(row => ({
      id: row.id,
      name: `${row.nombre} ${row.apellido}`,
      nick: row.nick,
      foto: row.foto || 'default.png',
      qr_token: row.qr_token,
      role: row.role || 'Sin Rol'
    }));

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Error al obtener los usuarios' },
      { status: 500 }
    );
  }
}
