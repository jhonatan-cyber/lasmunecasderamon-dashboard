/**
 * Infraestructura del módulo Asistencia para los equipos biométricos y sus
 * registros. SQL privado: nadie fuera de `modules/asistencia` importa este archivo
 * (§5).
 *
 * Estas consultas vivían dentro de `/api/biometric/devices/[id]/poller` y
 * `/api/biometric/records/[id]/foto`, que mezclaban adaptación, consulta y el
 * arranque o apagado del listener.
 */
import { query } from '@/lib/database/db';

/** Fila mínima del equipo: lo que hace falta para encender el recolector. */
export interface FilaEquipo {
  id: string;
  serial: string;
  ip: string | null;
  usuario_equipo: string | null;
  clave_cifrada: string | null;
}

/**
 * Equipo vigente por id. Filtra los revocados: un equipo revocado no vuelve a
 * encender el recolector ni por error ni por una ruta que lo pidiera.
 */
export async function obtenerEquipoVigente(id: string): Promise<FilaEquipo[]> {
  return await query<FilaEquipo[]>(
    'SELECT id, serial, ip, usuario_equipo, clave_cifrada FROM biometric_devices WHERE id = ? AND revocado_en IS NULL',
    [id]
  );
}

/** Enciende o apaga el recolector de registros del equipo. */
export async function setRecogerRegistros(id: string, activo: boolean): Promise<void> {
  await query('UPDATE biometric_devices SET recoger_registros = ? WHERE id = ?', [
    activo ? 1 : 0,
    id
  ]);
}

/** Foto de la verificación que originó una asistencia. */
export async function obtenerFotoDeRecord(id: string): Promise<{ foto: Buffer | null }[]> {
  return await query<{ foto: Buffer | null }[]>(
    'SELECT foto FROM biometric_device_records WHERE id = ?',
    [id]
  );
}
