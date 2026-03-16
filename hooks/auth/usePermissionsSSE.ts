import { useSSE } from '@/hooks/shared/useSSE';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function usePermissionsSSE() {
  const { user, refreshPermissions } = useAuth();

  const sseUrl = (!user || user.role?.toLowerCase() === 'administrador') ? null : '/api/permissions/sse';

  useSSE(sseUrl, (data) => {
    if (data.type === 'connected') return;

    if (data.type === 'permissions-updated') {
      const affectsCurrentUser =
        data.roleId === user?.roleId ||
        data.userId === user?.id ||
        !data.roleId;

      if (affectsCurrentUser) {
        refreshPermissions(true);
        toast.success('Permisos actualizados', { duration: 3000 });
      }
    }

    if (data.type === 'role-deleted') {
      if (data.roleId === user?.roleId) {
        toast.error('Tu rol ha sido eliminado', {
          description: 'Serás redirigido al login',
          duration: 3000,
        });

        setTimeout(() => {
          window.location.href = '/login';
        }, 3000);
      }
    }
  });

  return null;
}
