import { NextResponse } from 'next/server';
import { query } from '@/lib/database/db';

export const dynamic = 'force-dynamic';

/**
 * Padrón público: nombres, nicks, fotos y roles del personal activo (sin administración).
 *
 * Acá vivía también `qr_token`, que era la credencial que aceptaba
 * POST /api/attendance/register: cualquiera desde internet podía leer el padrón con sus
 * credenciales y marcar asistencia ajena. También devolvía el código del local (y lo
 * generaba si faltaba), lo que permitía leerlo a distancia y usarlo como prueba de
 * presencia. Nada de eso se expone: el QR de asistencia es un desafío que el servidor
 * emite solo a las pantallas del local, y el código lo sirve el tablero del kiosko.
 *
 * Lo que queda es información de contacto interna (quiénes trabajan y sus nicks), que
 * es la que la pantalla de la entrada muestra. Si no hace falta para nadie más, este
 * endpoint se puede retirar: hoy lo consume solamente /asistencia-qr.
 */
export async function GET() {
  try {
    const rows = await query<any[]>(`
      SELECT u.id_usuario as id, u.nombre, u.apellido, u.nick, u.foto, r.nombre as role
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
      role: row.role || 'Sin Rol'
    }));

    return NextResponse.json({ success: true, data: users });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Error al obtener los usuarios' },
      { status: 500 }
    );
  }
}
