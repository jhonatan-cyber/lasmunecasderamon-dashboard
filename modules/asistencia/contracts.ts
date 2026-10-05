/**
 * Contratos públicos del módulo Asistencia — aptos para cliente (§5).
 *
 * Sólo tipos: nada de implementaciones de servidor, filas del driver ni tipos
 * de repositorio. Las formas replican las respuestas HTTP que la UI ya
 * consume; cambiarlas es un cambio de contrato HTTP, no un detalle de la
 * migración. `types/asistencia.ts` reexporta desde aquí para no romper a los
 * consumidores existentes.
 */

/** Fila del resumen administrativo de asistencias, con montos del período. */
export interface AsistenciaResumen {
  id_usuario: string;
  nick: string;
  nombre_completo: string;
  usuario_foto: string;
  total_asistencias: number;
  sueldo_total: number;
  aporte_total: number;
  descuento_total: number;
  total_final: number;
}

/** Estadísticas del período para la vista de asistencias. */
export interface AsistenciaStats {
  total: number;
  presentes: number;
  ausentes: number;
  porcentajeAsistencia: number;
  fechaApertura?: string | null;
  fechaCierre?: string | null;
}

/** Envolvente HTTP estándar del listado de resumen. */
export interface AsistenciaResponse {
  success: boolean;
  data?: AsistenciaResumen[];
  error?: string;
  details?: unknown;
}

export { CLAVES_ASISTENCIA } from './configuracionClaves';
