import { NextResponse } from 'next/server';
import { listarUsuariosPublicos } from '@/modules/identidad';

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
    return NextResponse.json({ success: true, data: await listarUsuariosPublicos() });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Error al obtener los usuarios' },
      { status: 500 }
    );
  }
}
