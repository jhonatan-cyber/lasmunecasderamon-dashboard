import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useGenericFetch } from '../shared/useGenericFetch';

interface CurrentUser {
  id: number;
  name: string;
  lastName: string;
  email?: string;
  role: string;
  status: number;
  foto?: string;
  username?: string;
  permissions?: any;
  phone?: string;
  address?: string;
  fecha_crea?: string;
}

interface UseCurrentUserReturn {
  user: CurrentUser | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useCurrentUser = (): UseCurrentUserReturn => {
  const pathname = usePathname();

  // Verificar si es una página pública
  const isPublicPage = useMemo(() => 
    pathname === '/login' ||
    pathname === '/api-docs' ||
    pathname === '/confirmar-anulacion' ||
    pathname === '/confirmar-anulacion-servicio',
    [pathname]
  );

  const {
    data,
    isLoading: loading,
    error,
    refetch: fetchCurrentUser,
  } = useGenericFetch<CurrentUser>('/api/auth/me', {
    initialFetch: !isPublicPage,
    transform: (data) => (data.success ? data.user : null),
  });

  const user = data?.[0] || null;

  // Refetch cuando cambia la ruta (solo si no es pública)
  useEffect(() => {
    if (!isPublicPage) {
      fetchCurrentUser();
    }
  }, [pathname, isPublicPage, fetchCurrentUser]);

  return {
    user,
    loading: isPublicPage ? false : loading,
    error,
    refetch: fetchCurrentUser
  };
};
