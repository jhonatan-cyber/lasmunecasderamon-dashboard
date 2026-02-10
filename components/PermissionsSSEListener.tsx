'use client';

import { usePermissionsSSE } from '@/hooks/auth/usePermissionsSSE';

/**
 * Componente que activa el listener de SSE para permisos
 * Debe montarse una sola vez en el layout raíz
 */
export function PermissionsSSEListener() {
  usePermissionsSSE();
  return null;
}
