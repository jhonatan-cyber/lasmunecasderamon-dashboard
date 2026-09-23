import { useSharedSSE } from '@/hooks/shared';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function usePermissionsSSE() {
  const { user, refreshPermissions } = useAuth();

  const sseUrl =
    !user || user.role?.toLowerCase() === 'administrador' ? null : '/api/notifications/sse';

  useSharedSSE(sseUrl, (data: any) => {
    if (data.type === 'connected') return;

    if (data.type === 'permissions-updated') {
      const affectsCurrentUser =
        data.roleId === user?.roleId || data.userId === user?.id || !data.roleId;

      if (affectsCurrentUser) {
        refreshPermissions(true);
        toast.success('Permisos actualizados', { duration: 3000 });
      }
    }

    if (data.type === 'role-deleted') {
      if (data.roleId === user?.roleId) {
        toast.error('Tu rol ha sido eliminado', {
          description: 'Serás redirigido al login',
          duration: 3000
        });

        setTimeout(() => {
          // Full reload clears cached permissions after role deletion
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = '/login';
        }, 3000);
      }
    }
  });

  return null;
}
