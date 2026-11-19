/**
 * Roles que responden las solicitudes de covers. Las crea el barman, que es
 * quien sirve la barra; la autorización queda en caja y administración.
 */
const ROLES_AUTORIZAN_COVERS = new Set(['administrador', 'cajero', 'cajera']);

export function puedeAutorizarCovers(role?: string | null): boolean {
  return ROLES_AUTORIZAN_COVERS.has((role || '').toLowerCase());
}
