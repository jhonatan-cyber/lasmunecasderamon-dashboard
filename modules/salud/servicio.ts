/**
 * Casos de uso de Salud — aplicación del módulo.
 *
 * No toca SQL ni el driver: eso vive en `./repositorio`, privado del módulo.
 */
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import type { MemoriaProceso, ReporteSalud } from './contracts';
import * as repositorio from './repositorio';

function leerMemoria(): MemoriaProceso {
  const { heapUsed, heapTotal } = process.memoryUsage();
  return {
    used: Math.round(heapUsed / 1024 / 1024),
    total: Math.round(heapTotal / 1024 / 1024)
  };
}

/**
 * Estado del proceso y de la base de datos.
 *
 * El estado global refleja el peor de los dos: si el driver no responde, el
 * servicio no está sano aunque el proceso siga vivo.
 */
export async function obtenerReporteDeSalud(): Promise<ReporteSalud> {
  const database = await repositorio.comprobarBaseDatos();
  return {
    status: database.status === 'healthy' ? 'healthy' : 'unhealthy',
    timestamp: getNowInBusinessTimezone(),
    uptime: process.uptime(),
    database,
    memory: leerMemoria()
  };
}
