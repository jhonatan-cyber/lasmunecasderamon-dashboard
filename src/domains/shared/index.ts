/**
 * Dominio: Shared
 *
 * Tipos y utilidades cross-dominio que se comparten entre todos los módulos.
 * Esta carpeta puede crecer según las necesidades de código compartido.
 *
 * Ejemplos de código que podría vivir aquí:
 * - Tipos de base (entities, value objects genéricos)
 * - Utilidades de validación compartidas
 * - Constantes globales
 */

export const DOMAIN_NAME = 'shared' as const;
export type DomainName = typeof DOMAIN_NAME;
