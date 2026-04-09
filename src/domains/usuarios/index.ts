/**
 * Dominio: Usuarios
 *
 * Estructura DDD con las capas:
 * - domain: Entidades y value objects
 * - application: Casos de uso
 * - infrastructure: Implementaciones (repositories, servicios)
 * - interfaces: Contratos y tipos públicos
 */

// Re-export desde sub-carpetas (solo si existen archivos)
// Esto permite que el dominio crezca incrementalmente
// Usage: import { UserEntity } from '@/domains/usuarios/domain'

// Por ahora, el dominio está vacío - se migrará en Phase 4
export const DOMAIN_NAME = 'usuarios' as const;
export type DomainName = typeof DOMAIN_NAME;
