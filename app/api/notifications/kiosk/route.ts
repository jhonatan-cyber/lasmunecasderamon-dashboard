import { NextResponse } from 'next/server';
import { createSseStream } from '@/lib/api/sseStream';
import { getKioskDevice, isDeviceActive } from '@/modules/asistencia';

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

  const controller = new AbortController();
  const stop = () => controller.abort();
  const interval = setInterval(() => {
    void isDeviceActive(deviceId)
      .then(active => {
        if (!active) stop();
      })
      .catch(stop);
  }, 60_000);
  const cleanup = () => {
    clearInterval(interval);
    request.signal.removeEventListener('abort', stop);
  };
  controller.signal.addEventListener('abort', cleanup, { once: true });
  request.signal.addEventListener('abort', stop, { once: true });
  const response = createSseStream(
    new Request(request, { signal: controller.signal }),
    { channel: 'kiosk' },
    cleanup
  );
  if (request.signal.aborted) stop();
  return response;
}
