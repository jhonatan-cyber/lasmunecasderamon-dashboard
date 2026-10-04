/**
 * DTOs de asistencia para la UI.
 *
 * Desde la Fase 3 las formas viven en el módulo dueño
 * (`modules/asistencia/contracts.ts`); este archivo sólo reexporta para no
 * romper a los consumidores existentes. Es el único tipo de asistencia que la
 * UI puede importar directo (la puerta sólo permite `contracts.ts`).
 */
export type {
  AsistenciaResumen,
  AsistenciaStats,
  AsistenciaResponse
} from '@/modules/asistencia/contracts';
