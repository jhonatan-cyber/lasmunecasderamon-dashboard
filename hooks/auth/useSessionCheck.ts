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
    pathname === '/' ||
    pathname === '/landing' ||
    pathname === '/terminos-y-condiciones' ||
    pathname === '/politica-de-privacidad' ||
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
        isCheckingRef.current = false;
        return;
      }

      const data = await response.json();

      if (data.success && data.debeDesconectar) {
        toast.info('Sesión expirada', {
          description: 'Debe ingresar con código de verificación',
          duration: 3000
        });

        localStorage.removeItem('userRole');

        setTimeout(() => {
          router.push(`/login?redirect=${encodeURIComponent(pathname || '/')}`);
        }, 500);
      }
    } catch (error) {
    } finally {
      isCheckingRef.current = false;
    }
  };

  useEffect(() => {
    if (isPublicPage) return;
    checkInterval.current = setInterval(checkSessionStatus, 300000);

    const initialCheckTimeout = setTimeout(() => {
      checkSessionStatus();
    }, 5000);

    const handleVisibilityChange = () => {
      if (!document.hidden && !isPublicPage) {
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
    checkSessionStatus
  };
};
