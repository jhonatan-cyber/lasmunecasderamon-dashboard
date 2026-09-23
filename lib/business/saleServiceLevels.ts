// Niveles de servicio por precio de venta (configurables en Comisiones):
// - Desde `hostessDesde`: se puede asignar 1 anfitriona por producto.
// - Desde `habitacionDesde`: además se requiere/permite habitación.
// Por defecto: 20.000 / 30.000.

export interface ServiceLevelConfig {
  hostessDesde: number;
  habitacionDesde: number;
}

export const DEFAULT_SERVICE_LEVELS: ServiceLevelConfig = {
  hostessDesde: 20000,
  habitacionDesde: 30000
};

export type ServiceLevel = 'ninguno' | 'anfitriona' | 'anfitriona+habitacion';

export function normalizeServiceLevels(
  parcial?: Partial<ServiceLevelConfig> | null
): ServiceLevelConfig {
  const hostess = Number(parcial?.hostessDesde);
  const habitacion = Number(parcial?.habitacionDesde);
  return {
    hostessDesde:
      Number.isFinite(hostess) && hostess >= 0
        ? Math.floor(hostess)
        : DEFAULT_SERVICE_LEVELS.hostessDesde,
    habitacionDesde:
      Number.isFinite(habitacion) && habitacion >= 0
        ? Math.floor(habitacion)
        : DEFAULT_SERVICE_LEVELS.habitacionDesde
  };
}

export function getServiceLevel(
  precio: number | string | null | undefined,
  config?: Partial<ServiceLevelConfig> | null
): ServiceLevel {
  const { hostessDesde, habitacionDesde } = normalizeServiceLevels(config);
  const monto = Number(precio ?? 0);
  if (!Number.isFinite(monto) || monto < hostessDesde) return 'ninguno';
  if (monto < habitacionDesde) return 'anfitriona';
  return 'anfitriona+habitacion';
}

export function requiereAnfitriona(
  precio: number | string | null | undefined,
  config?: Partial<ServiceLevelConfig> | null
): boolean {
  return getServiceLevel(precio, config) !== 'ninguno';
}

export function requiereHabitacion(
  precio: number | string | null | undefined,
  config?: Partial<ServiceLevelConfig> | null
): boolean {
  return getServiceLevel(precio, config) === 'anfitriona+habitacion';
}
