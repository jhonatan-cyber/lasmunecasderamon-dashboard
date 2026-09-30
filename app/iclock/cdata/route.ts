import { NextResponse } from 'next/server';
import {
  buildAdmsOptions,
  parseAttlog,
  serialFromParams,
  tableFromParams
} from '@/lib/biometric/adapters/zkteco';
import { findActiveDevice, touchDevice } from '@/lib/biometric/deviceAuth';
import { procesarEventoBiometrico } from '@/lib/biometric/processBiometricEvent';
import logger from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

const TEXT_PLAIN = { 'Content-Type': 'text/plain; charset=utf-8' };

function rechazo(motivo: string, status = 401) {
  return new NextResponse(motivo, { status, headers: TEXT_PLAIN });
}

/**
 * Entrada ZKTeco (protocolo ADMS / iClock push).
 *
 * Ruta fuera de `/api` a propósito: el equipo habla HTTP plano, sin Origin ni
 * sesión, y el handshake repite cada pocos segundos (no debe chocar con el rate
 * limit ni con el chequeo de CSRF del middleware). El serial autorizado se
 * resuelve contra `biometric_devices` dentro del handler.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const serial = serialFromParams(searchParams);
  if (!serial) return rechazo('Falta SN', 400);

  const device = await findActiveDevice(serial);
  if (!device) {
    logger.warn('[biometric] Handshake de serial no autorizado', { serial });
    return rechazo('Serial no autorizado');
  }

  await touchDevice(device.id);
  // Handshake: respondemos las opciones para que el equipo empiece a conectarse solo.
  return new NextResponse(buildAdmsOptions(device.serial), { headers: TEXT_PLAIN });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const serial = serialFromParams(searchParams);
  if (!serial) return rechazo('Falta SN', 400);

  const device = await findActiveDevice(serial);
  if (!device) {
    logger.warn('[biometric] Evento de serial no autorizado', { serial });
    return rechazo('Serial no autorizado');
  }

  const table = tableFromParams(searchParams);
  const body = await request.text();
  await touchDevice(device.id);

  // Solo las asistencias interesan; OPERLOG/USERINFO/fotos se acusan sin procesar.
  if (table !== 'ATTLOG') return new NextResponse('OK', { headers: TEXT_PLAIN });

  const eventos = parseAttlog(body);
  for (const evento of eventos) {
    try {
      await procesarEventoBiometrico(evento, device);
    } catch (error) {
      logger.error('[biometric] Error procesando evento ATTLOG', {
        serial: device.serial,
        codigo: evento.codigo,
        error
      });
    }
  }

  // El equipo da por enviado lo que respondió OK: nada se pierde, todo quedó
  // auditado en biometric_events (incluidos los códigos sin usuario).
  return new NextResponse('OK', { headers: TEXT_PLAIN });
}
