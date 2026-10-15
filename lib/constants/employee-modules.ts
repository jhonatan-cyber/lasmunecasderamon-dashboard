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
export function getEmployeeModules(role: string | undefined): EmployeeModule[] {
  const normalized = role?.toLowerCase();
  if (!normalized || !['cajero', 'barman', 'garzon', 'anfitriona'].includes(normalized)) return [];
  const extra =
    normalized === 'anfitriona'
      ? (['comisiones', 'servicios', 'calendar'] as const)
      : (['propinas', 'horas-extras', 'calendar'] as const);
  return [
    ...common.map(([key, name]) => ({ key, name, href: '/' + normalized + '-' + key })),
    ...extra.map(key => ({ key, name: labels[key], href: '/' + normalized + '-' + key }))
  ];
}
