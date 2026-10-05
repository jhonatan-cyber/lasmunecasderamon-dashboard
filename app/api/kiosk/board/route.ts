import { NextResponse } from 'next/server';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { getOrCreateAttendanceCode } from '@/modules/identidad';
import { consultarVentana, getKioskDevice, listarMarcasDelDia } from '@/modules/asistencia';
import { listarPersonalActivo } from '@/modules/identidad';
import { obtenerValorConfiguracion } from '@/modules/configuracion';

export const dynamic = 'force-dynamic';

/**
 * Tablero de la pantalla del kiosko: quién puede marcar, quién ya marcó y el código
 * del local vigente.
 *
 * Reemplaza a `/api/public/users` como fuente de la pantalla, que era pública y
 * devolvía el QR de cada persona (o sea, la credencial). Acá no hay ninguna credencial
 * personal: el QR se pide aparte, por persona y por 120 segundos.
 *
 * Son tres lecturas de tres dueños distintos —el padrón es de Identidad, las marcas y
 * la ventana son de Asistencia, la zona horaria es de Configuración— y la ruta las
 * une sin tocar ninguna tabla.
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

  const usuarios = await listarPersonalActivo();
  const asistencias = await listarMarcasDelDia(fechaHoy);
  const marcaron = new Map(asistencias.map(row => [String(row.usuario_id), String(row.hora)]));

  const { startHour, endHour } = await consultarVentana();
  const timezone = (await obtenerValorConfiguracion('timezone')) || 'America/Santiago';

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
        timezone
      },
      fecha: fechaHoy
    }
  });
}
