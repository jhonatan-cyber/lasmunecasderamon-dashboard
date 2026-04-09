/**
 * Dominio: Asistencia
 *
 * Estructura DDD con las capas:
 * - domain: Entidades y value objects
 * - application: Casos de uso
 * - infrastructure: Implementaciones (repositories, servicios)
 * - interfaces: Contratos y tipos públicos
 */

export const DOMAIN_NAME = 'asistencia' as const;
export type DomainName = typeof DOMAIN_NAME;
