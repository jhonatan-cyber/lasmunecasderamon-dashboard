import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

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
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();

  // Verificar si es una página pública
  const isPublicPage =
    pathname === '/login' ||
    pathname === '/api-docs' ||
    pathname === '/confirmar-anulacion' ||
    pathname === '/confirmar-anulacion-servicio';

  const fetchCurrentUser = async () => {
    // Si es una página pública, no hacer la llamada
    if (isPublicPage) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al obtener usuario actual');
      }

      setUser(data.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
     
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, [pathname]); // Agregar pathname como dependencia

  return {
    user,
    loading,
    error,
    refetch: fetchCurrentUser
  };
};
