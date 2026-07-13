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

export function AuthProvider({ children }: { children: ReactNode }) {
  const permissionsRefreshRef = useRef<(force?: boolean) => Promise<void>>(async () => {});

  const sessionResult = useAuthSession({
    onPermissionsRefresh: async (force?: boolean) => {
      await permissionsRefreshRef.current(force);
    }
  });

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
