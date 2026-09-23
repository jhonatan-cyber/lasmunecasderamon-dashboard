import { NextResponse } from 'next/server';
import { createSseStream } from '@/lib/api/sseStream';
import { getKioskDevice } from '@/lib/kiosk/deviceAuth';

export const dynamic = 'force-dynamic';

/**
 * Canal de eventos de la pantalla de asistencia (`/asistencia-qr`).
 *
 * Esa pantalla necesita enterarse en el momento de dos cosas: que alguien registró su
 * asistencia (para confirmarlo y para pedir un QR nuevo, porque el desafío es de un solo
 * uso) y que cambió el código del local que muestra.
 *
 * Ya no es un canal público: la pantalla se provisiona con la credencial del kiosko, así
 * que solo se conecta la máquina del local. Su audiencia está declarada en
 * `lib/api/sseEvents.ts` como `channel: 'kiosk'`, con proyección acotada: de cada evento
 * salen solo los campos enumerados, y sin credenciales.
 */
export async function GET(request: Request) {
  const deviceId = await getKioskDevice();
  if (!deviceId) {
    return NextResponse.json(
      { success: false, message: 'Pantalla no vinculada', code: 'KIOSK_NOT_LINKED' },
      { status: 401 }
    );
  }

  return createSseStream(request, { channel: 'kiosk' });
}
