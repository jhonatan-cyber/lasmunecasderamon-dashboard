import { useEffect, useRef } from 'react';
import { useCurrentUser } from './useCurrentUser';

/**
 * Hook para escuchar actualizaciones de permisos en tiempo real mediante SSE
 * Este hook se conecta al servidor y recibe notificaciones cuando los permisos cambian
 */
export function usePermissionsSSE() {
  const { user } = useCurrentUser();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Solo conectar si hay un usuario autenticado y no es administrador
    if (!user || user.role?.toLowerCase() === 'administrador') {
      return;
    }

    // Crear conexión SSE
    const eventSource = new EventSource('/api/permissions/sse');
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'permissions-updated') {
          // Emitir evento local para que useUserPermissions lo capture
          window.dispatchEvent(new CustomEvent('permissions-updated', {
            detail: { roleId: data.roleId, source: 'sse' }
          }));
        }
      } catch (error) {
        console.error('Error al procesar mensaje SSE:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ Error en conexión SSE:', error);
      eventSource.close();
    };

    // Cleanup al desmontar
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [user]);

  return null;
}
