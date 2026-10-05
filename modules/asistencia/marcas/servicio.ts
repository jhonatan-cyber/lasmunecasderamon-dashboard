/**
 * Casos de uso de marcas de asistencia — aplicación del módulo Asistencia.
 *
 * Valida la entrada y orquesta la infraestructura propia. No toca SQL ni el
 * driver: eso vive en `./repositorio`, privado del módulo. El actor llega
 * verificado desde la ruta (contrato de Identidad, `Actor`); el módulo no
 * consulta permisos.
 *
 * Migrado de `lib/services/AttendanceService.ts` (Fase 3): las mismas ocho
 * operaciones más `consultarVentana`, la lectura de la ventana horaria
 * (`asistencia_hora_inicio`/`asistencia_hora_fin`) que antes se importaba
 * directo del repositorio desde la ruta del tablero del kiosko.
 */
import { z } from 'zod';
import { AttendanceRegisterSchema } from '@/lib/business/schemas';
import type { Actor } from '@/modules/identidad/contracts';
import * as repositorio from './repositorio';

type EntradaAsistencia = z.input<typeof AttendanceRegisterSchema>;

/** Registra una marca (QR, código o desafío canjeado) con validación zod. */
export async function registrarAsistencia(entrada: EntradaAsistencia, actor?: Actor, ip?: string) {
  const validated = AttendanceRegisterSchema.parse(entrada);
  return repositorio.registerAttendance(validated, actor, ip);
}

/** Marcas de un usuario, opcionalmente filtradas por tipo y rango de fechas. */
export async function listarAsistenciasDeUsuario(
  usuarioId: string,
  tipo?: string,
  fechaInicio?: string,
  fechaFin?: string
) {
  return repositorio.getAttendanceByUser(usuarioId, tipo, fechaInicio, fechaFin);
}

/** Marcas de un usuario en las fechas dadas (calendario del rol). */
export async function listarAsistenciasPorFechas(usuarioId: string, fechas: string[]) {
  return repositorio.getAttendanceByDates(usuarioId, fechas);
}

/** Marcas de un día: la hora de entrada de cada persona que ya asistió. */
export async function listarMarcasDelDia(fecha: string) {
  return repositorio.getMarcasDelDia(fecha);
}

/** Resumen del día para la vista general. */
export async function listarAsistenciasDeHoy() {
  return repositorio.getAttendanceHoy();
}

/** Registro masivo del día para quienes no marcaron (usado por personal). */
export async function registrarAsistenciaMasivaDeHoy(ip?: string) {
  return repositorio.registerMasivoHoy(ip);
}

/** Resumen por usuario con montos (la vista de asistencias administrativa). */
export async function listarResumenAsistencias() {
  return repositorio.getAttendanceSummary();
}

/** Alta manual de una marca por parte de un administrador. */
export async function registrarAsistenciaManual(
  usuarioId: string,
  fecha: string,
  hora: string,
  estado: string,
  actor: Actor
) {
  return repositorio.registerAttendanceManual(usuarioId, fecha, hora, estado, actor);
}

/** Estadísticas de asistencia (presentes, ausentes, porcentaje). */
export async function consultarEstadisticasAsistencia() {
  return repositorio.getAttendanceStats();
}

/**
 * Ventana horaria de asistencia vigente (`asistencia_hora_inicio`/`fin` con
 * defaults 21–23). La leen el tablero del kiosko y las reglas de marcaje.
 */
export async function consultarVentana(): Promise<{ startHour: number; endHour: number }> {
  return repositorio.getAttendanceConfigHours();
}
