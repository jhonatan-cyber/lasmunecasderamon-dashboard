import { useAuth } from '@/contexts/AuthContext';

interface CurrentUser {
  id: number;
  name: string;
  lastName: string;
  email?: string;
  role: string;
  roleId?: number;
  status: number;
  foto?: string;
  username?: string;
  permissions?: Record<string, unknown>;
  phone?: string;
  address?: string;
  fecha_crea?: string;
}

interface UseCurrentUserReturn {
  user: CurrentUser | null;
  loading: boolean;
  error: string | null;
  refetch: (silent?: boolean) => Promise<void>;
}

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
