/**
 * Infraestructura del módulo Configuración para la tabla `backups`. SQL privado:
 * nadie fuera de `modules/configuracion` importa este archivo (§5).
 *
 * Estas consultas vivían dentro de las tres rutas de `/api/settings/backup`, que
 * mezclaban adaptación, consulta y el snapshot/restore de PostgreSQL.
 */
import { query } from '@/lib/database/db';
import type { Respaldo, RespaldoConDatos } from '../contracts';

/** Últimos respaldos, sin el `json_data`, que pesa. */
export async function listarRespaldos(): Promise<Respaldo[]> {
  const filas = await query<FilaRespaldo[]>(`
      SELECT id_backup, nombre, descripcion, tablas_incluidas, registros_count,
             tamano_bytes, fecha_crea, estado
      FROM backups
      ORDER BY fecha_crea DESC
      LIMIT 50
    `);

  return filas.map(fila => ({
    ...fila,
    tablas_incluidas: fila.tablas_incluidas ? JSON.parse(fila.tablas_incluidas) : [],
    tamano_bytes: Number(fila.tamano_bytes) || 0
  }));
}

/** Guardar el respaldo nuevo, con su volcado embebido. */
export async function guardarRespaldo(respaldo: {
  id: string;
  nombre: string;
  descripcion: string;
  tablas_incluidas: string;
  registros_count: number;
  tamano_bytes: number;
  json_data: string;
  fecha_crea: string;
}): Promise<void> {
  await query(
    `INSERT INTO backups (id_backup, nombre, descripcion, tablas_incluidas, registros_count, tamano_bytes, json_data, fecha_crea, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      respaldo.id,
      respaldo.nombre,
      respaldo.descripcion,
      respaldo.tablas_incluidas,
      respaldo.registros_count,
      respaldo.tamano_bytes,
      respaldo.json_data,
      respaldo.fecha_crea
    ]
  );
}

/** Datos del respaldo para descargarlo. */
interface FilaRespaldo {
  id_backup: string;
  nombre: string;
  descripcion: string | null;
  tablas_incluidas: string;
  registros_count: number;
  tamano_bytes: string | number;
  fecha_crea: string;
  estado: number;
}

export async function obtenerRespaldoParaDescarga(
  id: string
): Promise<{ nombre: string; json_data: string | null; fecha_crea: string }[]> {
  return await query<{ nombre: string; json_data: string | null; fecha_crea: string }[]>(
    'SELECT nombre, json_data, fecha_crea FROM backups WHERE id_backup = ?',
    [id]
  );
}

/** Respaldo completo, para restaurarlo. */
export async function obtenerRespaldo(id: string): Promise<RespaldoConDatos[]> {
  return await query<RespaldoConDatos[]>('SELECT * FROM backups WHERE id_backup = ?', [id]);
}
