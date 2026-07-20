'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useSharedSSE } from '@/hooks/shared';
import { isPublicRoute } from '@/lib/constants/routes';
import logger from '@/lib/utils/logger';

export interface CurrentUser {
  id: number;
  name: string;
  lastName: string;
  email?: string;
  role: string;
  roleId?: number;
  status: number;
  foto?: string;
  username?: string;
  permissions?: any;
  phone?: string;
  address?: string;
  fecha_crea?: string;
}

interface UseAuthSessionParams {
  onPermissionsRefresh?: (force?: boolean) => Promise<void>;
  onSessionExpired?: () => void;
}

interface UseAuthSessionReturn {
  user: CurrentUser | null;
  userLoading: boolean;
  refreshUser: (silent?: boolean) => Promise<void>;
  clearUser: () => void;
  isPublicPage: boolean;
}

export function useAuthSession({
  onPermissionsRefresh,
  onSessionExpired
}: UseAuthSessionParams): UseAuthSessionReturn {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  const userFetchedRef = useRef(false);
  const isFetchingUserRef = useRef(false);
  const sessionExpiredShownRef = useRef(false);
  const isMountedRef = useRef(true);

  const isPublicPage = useMemo(
    () =>
      pathname === '/' ||
      pathname === '/login' ||
      pathname === '/api-docs' ||
      isPublicRoute(pathname) ||
      pathname === '/asistencia-qr',
    [pathname]
  );

  const pathnameRef = useRef(pathname);
  const routerRef = useRef(router);
  const onSessionExpiredRef = useRef(onSessionExpired);

  useEffect(() => {
    pathnameRef.current = pathname;
    routerRef.current = router;
    onSessionExpiredRef.current = onSessionExpired;
  }, [pathname, router, onSessionExpired]);

  const handleSessionExpired = useCallback(() => {
    if (sessionExpiredShownRef.current) return;
    sessionExpiredShownRef.current = true;

    setUser(null);
    userFetchedRef.current = false;

    onSessionExpiredRef.current?.();

    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_role_hint');
    }

    toast.error('Sesion expirada', {
      description: 'Debe ingresar con codigo de verificacion',
      duration: 3000
    });

    setTimeout(() => {
      routerRef.current.push(`/login?redirect=${encodeURIComponent(pathnameRef.current || '')}`);
      sessionExpiredShownRef.current = false;
    }, 500);
  }, []);

  const fetchUser = useCallback(
    async (silent = false) => {
      if (!isMountedRef.current || isPublicPage || isFetchingUserRef.current) return;
      isFetchingUserRef.current = true;
      if (!silent || !userFetchedRef.current) {
        setUserLoading(true);
      }
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const timestamp = new Date().getTime();
        const response = await fetch(`/api/auth/me?t=${timestamp}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache'
          },
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.user) {
            setUser(result.user);

            if (typeof window !== 'undefined') {
              localStorage.setItem('auth_role_hint', result.user.role?.toLowerCase() || '');
            }
            userFetchedRef.current = true;
          } else if (!result.success) {
            handleSessionExpired();
          }
        } else if (response.status === 401) {
          handleSessionExpired();
        }
      } catch (error) {
        logger.captureException(error, { context: 'AuthContext:fetchUser' });
      } finally {
        setUserLoading(false);
        isFetchingUserRef.current = false;
      }
    },
    [handleSessionExpired, isPublicPage]
  );

  const clearUser = useCallback(() => {
    setUser(null);
    userFetchedRef.current = false;
  }, []);

  useEffect(() => {
    if (!isPublicPage && !userFetchedRef.current) {
      fetchUser();
    }
  }, [isPublicPage, fetchUser]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const sseUrl = isPublicPage || !user ? null : '/api/notifications/sse';
  useSharedSSE(sseUrl, async payload => {
    if (!user || !payload || payload.type === 'connected') return;
    const rolesAfectados = ['cajero', 'garzon', 'anfitriona'];
    const rolUsuario = user.role?.toLowerCase();

    const doLogout = (message: string) => {
      toast.warning('Sesion cerrada', { description: message, duration: 6000 });
      document.cookie = 'token=; Max-Age=0; path=/';
      setUser(null);
      userFetchedRef.current = false;
      setTimeout(() => router.push('/login'), 2000);
    };

    if (payload.type === 'permissions-updated' && rolUsuario !== 'administrador') {
      const affectsCurrentUser =
        payload.roleId === user.roleId || payload.userId === user.id || !payload.roleId;
      if (affectsCurrentUser && onPermissionsRefresh) {
        await onPermissionsRefresh(true);
        toast.success('Permisos actualizados', { duration: 3000 });
      }
      return;
    }
    if (payload.type === 'role-deleted' && payload.roleId === user.roleId) {
      toast.error('Tu rol ha sido eliminado', {
        description: 'Seras redirigido al login',
        duration: 3000
      });
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
      return;
    }
    if (payload.type === 'force_logout' && payload.data?.userId === user.id) {
      doLogout(payload.data.message || 'Ingresa nuevamente para registrar tu asistencia.');
      return;
    }
    if (payload.type === 'check_attendance' && rolesAfectados.includes(rolUsuario)) {
      try {
        const res = await fetch('/api/asistencias/hoy', { credentials: 'include' });
        const data = await res.json();
        if (!data.registrada) {
          doLogout('No registraste tu asistencia hoy. Ingresa nuevamente para registrarla.');
        }
      } catch {}
    }
  });

  return {
    user,
    userLoading,
    refreshUser: fetchUser,
    clearUser,
    isPublicPage
  };
}
