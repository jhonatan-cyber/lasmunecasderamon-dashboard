/**
 * Casos de uso de respaldos — aplicación del módulo Configuración.
 *
 * El snapshot y el restore de PostgreSQL son infraestructura (`lib/database/
 * maintenance`); el módulo los orquesta y guarda el resultado en `backups`.
 */
import { restoreDatabase, snapshotDatabase } from '@/lib/database/maintenance';
import type { Respaldo, RespaldoCreado } from '../contracts';
import * as repositorio from './repositorio';

/** Últimos respaldos para el listado de Configuraciones. */
export async function listarRespaldos(): Promise<Respaldo[]> {
  return repositorio.listarRespaldos();
}

/**
 * Toma el estado completo de la base y lo guarda. Devuelve el resumen que la
 * pantalla muestra; el volcado completo se queda en la fila.
 */
export async function crearRespaldo(entrada: {
  nombre?: string;
  descripcion?: string;
  usuarioNick?: string;
}): Promise<RespaldoCreado> {
  const timestamp = new Date();
  const dateStr = timestamp.toISOString().split('T')[0];
  const timeStr = timestamp.toTimeString().split(' ')[0].replace(/:/g, '-');
  const backupName = entrada.nombre || `backup_${dateStr}_${timeStr}`;

  const backupData = await snapshotDatabase();
  const totalRecords = Object.values(backupData).reduce((sum, rows) => sum + rows.length, 0);
  const totalBytes = Buffer.byteLength(JSON.stringify(backupData), 'utf8');

  const backupId = crypto.randomUUID();
  const now = new Date().toISOString().replace('T', ' ').split('.')[0];

  await repositorio.guardarRespaldo({
    id: backupId,
    nombre: backupName,
    descripcion: entrada.descripcion || `Backup automático - ${entrada.usuarioNick}`,
    tablas_incluidas: JSON.stringify(Object.keys(backupData)),
    registros_count: totalRecords,
    tamano_bytes: totalBytes,
    json_data: JSON.stringify(backupData),
    fecha_crea: now
  });

  return {
    id: backupId,
    nombre: backupName,
    descripcion: entrada.descripcion,
    tablas_incluidas: Object.keys(backupData).length,
    registros_count: totalRecords,
    tamano_bytes: totalBytes,
    fecha_crea: now
  };
}

/**
 * Datos crudos para la descarga. `null` cuando el respaldo existe pero no trae
 * volcado, que la ruta traduce en 400.
 */
export async function obtenerRespaldoParaDescarga(id: string) {
  const [respaldo] = await repositorio.obtenerRespaldoParaDescarga(id);
  return respaldo ?? null;
}

/** Restaura el respaldo. `null` si no existe; la ruta lo traduce en 404. */
export async function restaurarRespaldo(id: string) {
  const respaldo = (await repositorio.obtenerRespaldo(id))[0];
  if (!respaldo) return { encontrado: false as const };
  if (!respaldo.json_data) return { encontrado: true as const, conDatos: false as const };

  const restored = await restoreDatabase(JSON.parse(respaldo.json_data), id);
  return { encontrado: true as const, conDatos: true as const, restored };
}
