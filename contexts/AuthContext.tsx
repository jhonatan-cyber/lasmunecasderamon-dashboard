'use client';
import { createContext, useContext, useRef, useCallback, ReactNode } from 'react';
import { useAuthSession, CurrentUser } from './auth/useAuthSession';
import { useAuthPermissions, UserPermission } from './auth/useAuthPermissions';

interface AuthContextType {
  user: CurrentUser | null;
  userLoading: boolean;
  userPermissions: UserPermission[];
  permissionsLoading: boolean;
  permissionsLoaded: boolean;
  hasPermission: (module: string, action: string) => boolean;
  hasAnyPermission: (module: string) => boolean;
  hasAllPermissions: (module: string, actions: string[]) => boolean;
  refreshUser: (silent?: boolean) => Promise<void>;
  refreshPermissions: (forceRefresh?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Thin orchestrator composing useAuthSession + useAuthPermissions.
 *
 * Circular dependency broken via getUser getter:
 * - Permissions hook reads user via getUser() instead of a prop,
 *   so it doesn't need to be called after the session hook.
 * - Session hook's SSE handler calls permissions.refresh via the
 *   permissionsResult ref, and permissions hook calls session.clearUser
 *   via onSessionExpired callback.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // ── Session hook (user fetch, SSE, session expired) ────────────────
  // onPermissionsRefresh will be wired after permissions hook is created
  const permissionsRefreshRef = useRef<(force?: boolean) => Promise<void>>(async () => {});

  const sessionResult = useAuthSession({
    onPermissionsRefresh: async (force?: boolean) => {
      await permissionsRefreshRef.current(force);
    }
  });

  // ── Permissions hook (fetch, hasPermission, hasAny, hasAll) ────────
  // Uses getUser getter to break circular dependency — reads user from
  // session hook via a stable function reference.
  const permissionsResult = useAuthPermissions({
    getUser: () => sessionResult.user,
    onSessionExpired: sessionResult.clearUser
  });

  // Wire up the ref so session hook can trigger permissions refresh
  // eslint-disable-next-line react-hooks/refs
  permissionsRefreshRef.current = permissionsResult.refreshPermissions;

  const value: AuthContextType = {
    user: sessionResult.user,
    userLoading: sessionResult.userLoading,
    userPermissions: permissionsResult.userPermissions,
    permissionsLoading: permissionsResult.permissionsLoading,
    permissionsLoaded: permissionsResult.permissionsLoaded,
    hasPermission: permissionsResult.hasPermission,
    hasAnyPermission: permissionsResult.hasAnyPermission,
    hasAllPermissions: permissionsResult.hasAllPermissions,
    refreshUser: sessionResult.refreshUser,
    refreshPermissions: permissionsResult.refreshPermissions
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
