/**
 * Contratos del módulo de Salud — §5: «DTO y esquemas aptos para consumidores».
 *
 * Salud es el único módulo de infraestructura pura: no es dueño de ninguna tabla
 * de negocio, sólo consulta al driver para responder si el proceso sigue vivo.
 * Existe en el corte 12d para que `app/api/health` deje de importar
 * `lib/database/db` — el último import al driver que quedaba dentro de `app/api`.
 */

export type EstadoSalud = 'healthy' | 'unhealthy';

/** Resultado de preguntar al driver si responde. */
export interface EstadoBaseDatos {
  status: EstadoSalud;
  /** Fila que devuelve el sondeo (`{ health_check }`); es la prueba de vida. */
  response: unknown;
}

/** Consumo de memoria del proceso, en megas. */
export interface MemoriaProceso {
  used: number;
  total: number;
}

/** Cuerpo que la ruta `/api/health` devuelve dentro de `ApiResponse.success`. */
export interface ReporteSalud {
  status: EstadoSalud;
  /** Hora del negocio, no la del servidor: el panel cuenta en hora local. */
  timestamp: string;
  /** Segundos que lleva vivo el proceso. */
  uptime: number;
  database: EstadoBaseDatos;
  memory: MemoriaProceso;
}
