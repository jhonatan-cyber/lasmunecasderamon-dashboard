import { NextResponse } from 'next/server';
import { parseDahuaPush } from '@/lib/biometric/adapters/dahua';
import { findActiveDevice, touchDevice } from '@/lib/biometric/deviceAuth';
import { procesarEventoBiometrico } from '@/lib/biometric/processBiometricEvent';
import logger from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * Entrada Dahua (push HTTP en JSON).
 *
 * Misma decisión de ruta que `/iclock/cdata`: fuera de `/api` para que el equipo
 * no pase por el rate limit ni por el chequeo de Origin. La URL que se configura
 * en el terminal lleva el serial: `<sitio>/dahua/push?serial=<SERIAL>`.
 *
 * El parser es tolerante porque el payload exacto depende del modelo; lo que no
 * se reconoce no genera asistencia, solo queda auditado como `sin_usuario` o se
 * descarta si ni siquiera trae código de persona.
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const cuerpo = await request.text();
  const { serial: serialDelCuerpo, eventos } = parseDahuaPush(cuerpo, searchParams);
  const serial = (searchParams.get('serial') || serialDelCuerpo || '').trim();

  if (!serial) {
    return NextResponse.json(
      { success: false, message: 'Falta el serial del equipo', code: 'MISSING_SERIAL' },
      { status: 400 }
    );
  }

  const device = await findActiveDevice(serial);
  if (!device) {
    logger.warn('[biometric] Push Dahua de serial no autorizado', { serial });
    return NextResponse.json(
      { success: false, message: 'Serial no autorizado', code: 'UNKNOWN_SERIAL' },
      { status: 401 }
    );
  }

  await touchDevice(device.id);

  // Con el equipo real conviene ver el payload crudo: si el modelo manda algo
  // que el parser no entiende, aca aparece y se ajusta el adaptador.
  if (eventos.length === 0 && cuerpo.trim()) {
    logger.info('[biometric] Push Dahua sin eventos reconocidos', {
      serial: device.serial,
      contentType: request.headers.get('content-type'),
      cuerpo: cuerpo.substring(0, 2000)
    });
  }

  let procesados = 0;
  for (const evento of eventos) {
    try {
      await procesarEventoBiometrico(evento, device);
      procesados += 1;
    } catch (error) {
      logger.error('[biometric] Error procesando evento Dahua', {
        serial: device.serial,
        codigo: evento.codigo,
        error
      });
    }
  }

  return NextResponse.json({ success: true, recibidos: eventos.length, procesados });
}
