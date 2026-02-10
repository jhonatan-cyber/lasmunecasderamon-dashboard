import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';

/**
 * Hook para verificar el estado de la sesión periódicamente
 * NOTA: Este hook ahora trabaja en conjunto con AuthContext y fetchInterceptor
 * Solo hace verificaciones periódicas como respaldo
 */
export const useSessionCheck = () => {
  const router = useRouter();
  const pathname = usePathname();
  const checkInterval = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);

  // Páginas públicas que no requieren verificación
  const isPublicPage = 
    pathname === '/login' ||
    pathname === '/api-docs' ||
    pathname === '/confirmar-anulacion' ||
    pathname === '/confirmar-anulacion-servicio';

  const checkSessionStatus = async () => {
    // No verificar en páginas públicas
    if (isPublicPage) return;
    
    // Evitar verificaciones simultáneas
    if (isCheckingRef.current) return;
    
    isCheckingRef.current = true;

    try {
      const response = await fetch('/api/auth/check-session', {
        credentials: 'include'
      });

      // Si es 401, el fetchInterceptor ya lo manejará
      if (response.status === 401) {
        isCheckingRef.current = false;
        return; // Dejar que fetchInterceptor maneje la redirección
      }

      if (!response.ok) {
        console.warn('⚠️ [SESSION] Error verificando sesión:', response.status);
        isCheckingRef.current = false;
        return;
      }

      const data = await response.json();

      if (data.success && data.debeDesconectar) {
        // Sesión debe cerrarse
        toast.info('Sesión expirada', {
          description: 'Debe ingresar con código de verificación',
          duration: 3000,
        });

        // Limpiar datos locales
        localStorage.removeItem('userRole');
        
        // Redirigir al login
        setTimeout(() => {
          router.push(`/login?redirect=${encodeURIComponent(pathname || '/')}`);
        }, 500);
      }
    } catch (error) {
      // Solo log, no mostrar toast para evitar spam
      console.error('❌ [SESSION] Error verificando sesión:', error);
    } finally {
      isCheckingRef.current = false;
    }
  };

  useEffect(() => {
    // No iniciar verificaciones en páginas públicas
    if (isPublicPage) return;

    // Verificar sesión cada 5 minutos (300000 ms)
    // Esto es un respaldo, el sistema principal es AuthContext + fetchInterceptor
    checkInterval.current = setInterval(checkSessionStatus, 300000);

    // Verificación inicial (con delay para evitar conflicto con AuthContext)
    const initialCheckTimeout = setTimeout(() => {
      checkSessionStatus();
    }, 5000); // 5 segundos después de montar

    // Verificar cuando la ventana vuelve a estar activa
    const handleVisibilityChange = () => {
      if (!document.hidden && !isPublicPage) {
        // Delay para evitar múltiples verificaciones simultáneas
        setTimeout(checkSessionStatus, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
      clearTimeout(initialCheckTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router, isPublicPage]);

  return {
    checkSessionStatus,
  };
};
