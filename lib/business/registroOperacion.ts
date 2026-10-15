import { BusinessError } from '@/lib/errors/errors';

export interface HabitacionRegistro {
  precio?: unknown;
  comision_anfitriona?: unknown;
  estado?: unknown;
  actividad?: unknown;
}

export function esHabitacionLibreIngreso(habitacion: HabitacionRegistro): boolean {
  return Number(habitacion.precio || 0) <= 0 || Number(habitacion.comision_anfitriona || 0) <= 0;
}

export function validarAnfitrionasConfirmadas(solicitadas: string[], confirmadas: string[]): void {
  if (confirmadas.length !== solicitadas.length) {
    throw new BusinessError(
      'Hay anfitrionas seleccionadas que no estan logueadas en el local',
      'HOSTESS_NOT_LOGGED_IN'
    );
  }
}
