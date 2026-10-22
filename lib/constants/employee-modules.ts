export type EmployeeRole = 'cajero' | 'barman' | 'garzon' | 'anfitriona';
export type EmployeeModuleKey =
  | 'asistencias'
  | 'anticipos'
  | 'propinas'
  | 'horas-extras'
  | 'comisiones'
  | 'servicios'
  | 'calendar';
export interface EmployeeModule {
  key: EmployeeModuleKey;
  name: string;
  href: string;
}

const common = [
  ['asistencias', 'Mis asistencias'],
  ['anticipos', 'Mis anticipos']
] as const;
const labels = {
  propinas: 'Mis propinas',
  'horas-extras': 'Mis horas extras',
  comisiones: 'Mis comisiones',
  servicios: 'Mis servicios',
  calendar: 'Mi calendario'
};
/**
 * Prefijo de URL de cada rol. El rol se sigue llamando en español —es el valor de la
 * tabla `roles`, el que comparan `proxy.ts` y el que espera la app móvil—, pero su
 * ruta ya no se arma concatenándolo: cada rol tiene su slug en inglés.
 */
const ROLE_ROUTE_PREFIX: Record<EmployeeRole, string> = {
  cajero: 'cashier',
  barman: 'bartender',
  garzon: 'waiter',
  anfitriona: 'hostess'
};

/** Segmento de URL de cada módulo personal (`href` = `/<rol>-<módulo>`). */
const MODULE_ROUTE_SEGMENT: Record<EmployeeModuleKey, string> = {
  asistencias: 'attendance',
  anticipos: 'advances',
  propinas: 'tips',
  'horas-extras': 'overtime',
  comisiones: 'commissions',
  servicios: 'services',
  calendar: 'calendar'
};

/**
 * La `key` es el identificador del módulo (lo comparte la app móvil); el `href` es la
 * URL del dashboard. Traducirlos por separado permite renombrar la ruta sin tocar el
 * contrato con la app.
 */
function hrefDe(role: EmployeeRole, key: EmployeeModuleKey): string {
  return `/${ROLE_ROUTE_PREFIX[role]}-${MODULE_ROUTE_SEGMENT[key]}`;
}

export function getEmployeeModules(role: string | undefined): EmployeeModule[] {
  const normalized = role?.toLowerCase();
  if (!normalized || !(normalized in ROLE_ROUTE_PREFIX)) return [];
  const empleado = normalized as EmployeeRole;
  const extra =
    empleado === 'anfitriona'
      ? (['comisiones', 'servicios', 'calendar'] as const)
      : (['propinas', 'horas-extras', 'calendar'] as const);
  return [
    ...common.map(([key, name]) => ({ key, name, href: hrefDe(empleado, key) })),
    ...extra.map(key => ({ key, name: labels[key], href: hrefDe(empleado, key) }))
  ];
}
