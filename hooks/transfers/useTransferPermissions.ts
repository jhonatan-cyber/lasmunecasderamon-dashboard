'use client';

import { useAuth } from '@/contexts/AuthContext';
import {
  TRANSFER_CREATE_PERMISSION,
  TRANSFER_RESOLVE_PERMISSION
} from '@/lib/constants/transferPermissions';

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
