import { useCallback, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { isPublicRoute } from '@/lib/constants/routes';

export const useSessionCheck = () => {
  const router = useRouter();
  const pathname = usePathname();
  const isCheckingRef = useRef(false);

  const isPublicPage =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/api-docs' ||
    isPublicRoute(pathname) ||
    pathname === '/asistencia-qr';

  const checkSessionStatus = useCallback(async () => {
    if (isPublicPage || isCheckingRef.current) return;

    isCheckingRef.current = true;

    try {
      const response = await fetch('/api/auth/check-session', {
        credentials: 'include'
      });

      if (response.status === 401 || !response.ok) {
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
    } catch {
    } finally {
      isCheckingRef.current = false;
    }
  }, [isPublicPage, pathname, router]);

  useEffect(() => {
    if (isPublicPage) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void checkSessionStatus();
      }
    };

    const handleWindowFocus = () => {
      void checkSessionStatus();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [checkSessionStatus, isPublicPage]);

  return {
    checkSessionStatus
  };
};
