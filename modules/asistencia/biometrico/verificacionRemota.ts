import { query } from '@/lib/database/db';
import logger from '@/lib/utils/logger';
import { credencialesDeFila } from './deviceClient';
import { identificarImagen } from './identificacionFacial';
import { ErrorFacial } from './faceSdk';
import { abrirPuerta } from './puertaClient';

export type ResultadoVerificacionRemota =
  | { decision: 'abierto'; usuarioId: string; similitud: number }
  | { decision: 'sin_coincidencia' }
  | { decision: 'sin_cara' }
  | { decision: 'sin_imagen' }
  | { decision: 'deshabilitado' }
  | { decision: 'sin_equipo' }
  | { decision: 'error'; mensaje: string };

export interface SolicitudVerificacionRemota {
  dispositivoId: string;
  serial: string;
  foto: Buffer | null;
  codigoReclamado?: string | null;
  canal?: number;
}

async function codigoDeUsuario(usuarioId: string): Promise<string | null> {
  const filas = await query<{ codigo: string | null }[]>(
    `SELECT biometrico_codigo AS codigo FROM usuarios
      WHERE id_usuario = ? AND biometrico_codigo IS NOT NULL AND TRIM(biometrico_codigo) <> ''`,
    [usuarioId]
  );
  return filas[0]?.codigo?.trim() || null;
}

export async function evaluarVerificacionRemota(
  solicitud: SolicitudVerificacionRemota
): Promise<ResultadoVerificacionRemota> {
  const { dispositivoId, serial, foto } = solicitud;

  if (!foto || foto.length === 0) {
    logger.info('[biometric-puerta] Verificación remota sin imagen', { serial });
    return { decision: 'sin_imagen' };
  }

  const filas = await query<
    {
      verificacion_remota: number;
      ip: string | null;
      usuario_equipo: string | null;
      clave_cifrada: string | null;
    }[]
  >(
    `SELECT verificacion_remota, ip, usuario_equipo, clave_cifrada
       FROM biometric_devices WHERE id = ? AND revocado_en IS NULL`,
    [dispositivoId]
  );
  const fila = filas[0];
  if (!fila || Number(fila.verificacion_remota) !== 1) {
    return { decision: 'deshabilitado' };
  }
  const credenciales = credencialesDeFila(fila);
  if (!credenciales) {
    logger.warn('[biometric-puerta] Equipo habilitado sin credenciales', { serial });
    return { decision: 'sin_equipo' };
  }

  let identificacion: Awaited<ReturnType<typeof identificarImagen>>;
  try {
    identificacion = await identificarImagen(foto, dispositivoId);
  } catch (error) {
    if (error instanceof ErrorFacial && error.motivo === 'sin_cara') {
      logger.info('[biometric-puerta] La captura no tiene cara', { serial });
      return { decision: 'sin_cara' };
    }
    const mensaje = error instanceof Error ? error.message : String(error);
    logger.warn('[biometric-puerta] No se pudo identificar la captura', { serial, mensaje });
    return { decision: 'error', mensaje };
  }

  if (!identificacion) {
    logger.info('[biometric-puerta] Sin coincidencia; la puerta queda como estaba', { serial });
    return { decision: 'sin_coincidencia' };
  }

  try {
    const usuarioEquipo =
      (solicitud.codigoReclamado ?? '').trim() || (await codigoDeUsuario(identificacion.usuarioId));
    await abrirPuerta(credenciales, {
      canal: solicitud.canal ?? 1,
      usuarioId: usuarioEquipo
    });
    logger.info('[biometric-puerta] Puerta abierta por el servidor', {
      serial,
      usuarioId: identificacion.usuarioId,
      similitud: Number(identificacion.similitud.toFixed(3))
    });
    return {
      decision: 'abierto',
      usuarioId: identificacion.usuarioId,
      similitud: identificacion.similitud
    };
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    logger.warn('[biometric-puerta] No se pudo abrir la puerta', { serial, mensaje });
    return { decision: 'error', mensaje };
  }
}
