import { useAuth } from '@/contexts/AuthContext';

interface CurrentUser {
  id: number;
  name: string;
  lastName: string;
  email?: string;
  role: string;
  roleId?: number; // ID del rol para comparar con SSE
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

/**
 * Hook optimizado que usa el contexto de autenticación
 * Evita múltiples llamadas al API
 */
export const useCurrentUser = (): UseCurrentUserReturn => {
  const { user, userLoading, refreshUser } = useAuth();

  return {
    user,
    loading: userLoading,
    error: null,
    refetch: refreshUser
  };
};

export default useCurrentUser;
