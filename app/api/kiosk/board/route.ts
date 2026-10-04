import { NextResponse } from 'next/server';
import { query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { getOrCreateAttendanceCode } from '@/lib/business/codigoService';
import { consultarVentana } from '@/modules/asistencia';
import { getKioskDevice } from '@/modules/asistencia';

export const dynamic = 'force-dynamic';

/**
 * Tablero de la pantalla del kiosko: quién puede marcar, quién ya marcó y el código
 * del local vigente.
 *
 * Reemplaza a `/api/public/users` como fuente de la pantalla, que era pública y
 * devolvía el QR de cada persona (o sea, la credencial). Acá no hay ninguna credencial
 * personal: el QR se pide aparte, por persona y por 120 segundos.
 */
export async function GET() {
  const deviceId = await getKioskDevice();
  if (!deviceId) {
    return NextResponse.json(
      { success: false, message: 'Pantalla no vinculada', code: 'KIOSK_NOT_LINKED' },
      { status: 401 }
    );
  }

  const fechaHoy = getNowInBusinessTimezone().substring(0, 10);

  const usuarios = await query<any[]>(`
    SELECT u.id_usuario AS id, u.nombre, u.apellido, u.nick, u.foto, r.nombre AS rol
    FROM usuarios u
    LEFT JOIN roles r ON u.rol_id = r.id_rol
    WHERE u.estado = 1 AND (r.nombre IS NULL OR LOWER(r.nombre) <> 'administrador')
    ORDER BY u.nombre ASC, u.apellido ASC
  `);

  const asistencias = await query<any[]>(
    'SELECT usuario_id, hora FROM asistencias WHERE fecha = ? AND estado = 1',
    [fechaHoy]
  );
  const marcaron = new Map(asistencias.map(row => [String(row.usuario_id), String(row.hora)]));

  const { startHour, endHour } = await consultarVentana();
  const configuracion = await query<any[]>(
    "SELECT clave, valor FROM configuraciones WHERE clave = 'timezone'"
  );

  return NextResponse.json({
    success: true,
    data: {
      usuarios: usuarios.map(u => ({
        id: String(u.id),
        nombre: u.nombre,
        apellido: u.apellido,
        nick: u.nick,
        foto: u.foto || 'default.png',
        rol: u.rol || 'Sin Rol',
        marcada: marcaron.get(String(u.id)) ?? null
      })),
      codigo: await getOrCreateAttendanceCode(),
      config: {
        asistencia_hora_inicio: startHour,
        asistencia_hora_fin: endHour,
        timezone: configuracion[0]?.valor || 'America/Santiago'
      },
      fecha: fechaHoy
    }
  });
}
