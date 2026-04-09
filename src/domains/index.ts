/**
 * Dominios del proyecto - Arquitectura DDD
 *
 * Módulos funcionales del sistema:
 * - usuarios: users, clients, roles, permissions, auth
 * - pedidos: orders, sales, products, categories, rooms
 * - pagos: accounts, tips, commissions, overtime, advances
 * - reportes: stats, ventas-stats, payroll, gratificaciones
 * - asistencia: attendance, calendar, events
 * - shared: tipos y utilidades cross-dominio
 */

// Export de cada dominio
export * as Usuarios from './usuarios';
export * as Pedidos from './pedidos';
export * as Pagos from './pagos';
export * as Reportes from './reportes';
export * as Asistencia from './asistencia';
export * as Shared from './shared';

// Map de dominios para referencia
export const DOMAINS = {
  USUARIOS: 'usuarios',
  PEDIDOS: 'pedidos',
  PAGOS: 'pagos',
  REPORTES: 'reportes',
  ASISTENCIA: 'asistencia',
  SHARED: 'shared'
} as const;

export type DomainName = (typeof DOMAINS)[keyof typeof DOMAINS];
