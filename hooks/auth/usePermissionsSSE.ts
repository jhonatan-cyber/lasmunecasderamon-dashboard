import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function usePermissionsSSE() {
  const { user, refreshPermissions } = useAuth();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {

    if (!user || user.role?.toLowerCase() === 'administrador') {

      return;
    }

    const connectSSE = () => {
      try {

        const eventSource = new EventSource('/api/permissions/sse');
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {

          reconnectAttemptsRef.current = 0; 
        };

        eventSource.onmessage = (event) => {
          (async () => {
            try {

              const data = JSON.parse(event.data);

              if (data.type === 'connected') {

                return;
              }

              if (data.type === 'permissions-updated') {
                const affectsCurrentUser =
                  data.roleId === user.roleId ||
                  data.userId === user.id ||
                  !data.roleId; 


                if (affectsCurrentUser) {

                  await refreshPermissions(true); 

                  toast.success('Permisos actualizados', {
                    duration: 3000,
                  });
                }
              }

              if (data.type === 'role-deleted') {

                if (data.roleId === user.roleId) {
                  toast.error('Tu rol ha sido eliminado', {
                    description: 'Serás redirigido al login',
                    duration: 3000,
                  });

                  setTimeout(() => {
                    window.location.href = '/login';
                  }, 3000);
                }
              }
            } catch (error) {
              console.error('❌ [SSE] Error al procesar mensaje:', error);
            }
          })();
        };

        eventSource.onerror = (error) => {

          eventSource.close();

          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);


            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++;
              connectSSE();
            }, delay);
          } else {

            toast.warning('Conexión en tiempo real perdida', {
              description: 'Los cambios de permisos no se actualizarán automáticamente. Recarga la página.',
              duration: 5000,
            });
          }
        };
      } catch (error) {
        console.error('❌ [SSE] Error al crear conexión:', error);
      }
    };

 
    connectSSE();

   
    return () => {

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [user, refreshPermissions]);

  return null;
}
