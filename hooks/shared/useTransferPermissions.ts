'use client';

import { useAuth } from '@/contexts/AuthContext';
import {
  TRANSFER_CREATE_PERMISSION,
  TRANSFER_RESOLVE_PERMISSION
} from '@/lib/constants/transferPermissions';

/**
 * Permisos del módulo Transferencias: los pares del catálogo que cuelgan de
 * `lib/constants/transferPermissions` y que el servidor chequea con la misma
 * fuente, así ninguna superficie vuelve a comparar el nombre del rol a mano.
 *
 *  - `products/create` habilita Transferir; es el par del catálogo que concede
 *    el flag `write` que exige `POST /api/bar` y `POST /api/transfers`.
 *  - `products/accept_transfer` habilita Aprobar/Rechazar, igual que
 *    `PATCH /api/transfers`.
 *
 * `hasPermission` concede todo al administrador, así que la UI y la API coinciden
 * también para ese rol. Antes la comparación manual dejaba al administrador sin
 * botones de aprobación y `products/write` (inexistente en el catálogo) dejó al
 * botón Transferir visible solo para él.
 */
export function useTransferPermissions() {
  const { hasPermission } = useAuth();
  return {
    puedeTransferir: hasPermission(
      TRANSFER_CREATE_PERMISSION.module,
      TRANSFER_CREATE_PERMISSION.action
    ),
    puedeAprobar: hasPermission(
      TRANSFER_RESOLVE_PERMISSION.module,
      TRANSFER_RESOLVE_PERMISSION.action
    )
  };
}
