import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export const useSessionCheck = () => {
  const router = useRouter();
  const checkInterval = useRef<NodeJS.Timeout | null>(null);

  const checkSessionStatus = async () => {
    try {
      console.log('🔍 [SESSION] Verificando estado de sesión...');
      
      const response = await fetch('/api/auth/check-session', {
        credentials: 'include' // Incluir cookies automáticamente
      });

      console.log('📊 [SESSION] Status de respuesta:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [SESSION] Error en respuesta:', errorText);
        throw new Error(`Error en la verificación de sesión: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ [SESSION] Respuesta de verificación:', data);

      if (data.success && data.debeDesconectar) {
        console.log('🔒 [SESSION] Usuario debe ser desconectado');
        
        // Mostrar mensaje al usuario
        toast.info('Sesión expirada. Debe ingresar con código de verificación.', {
          duration: 5000,
        });

        // Limpiar datos locales y redirigir al login
        localStorage.removeItem('userRole');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    } catch (error) {
      console.error('❌ [SESSION] Error verificando sesión:', error);
      // No mostrar toast de error para evitar spam, solo log
    }
  };

  useEffect(() => {
    // Verificar sesión cada 5 minutos (300000 ms)
    checkInterval.current = setInterval(checkSessionStatus, 300000);

    // Verificación inicial
    checkSessionStatus();

    // Verificar cuando la ventana vuelve a estar activa
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('📱 [SESSION] Ventana ha vuelto a estar activa');
        checkSessionStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router]);

  return {
    checkSessionStatus,
  };
};
