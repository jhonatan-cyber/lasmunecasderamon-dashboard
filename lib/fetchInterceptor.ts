/**
 * Interceptor global para manejar errores de autenticación
 * Detecta respuestas 401 y redirige automáticamente al login
 */

let isRedirecting = false;

export function setupFetchInterceptor() {
  // Solo ejecutar en el cliente
  if (typeof window === 'undefined') return;

  // Guardar el fetch original
  const originalFetch = window.fetch;

  // Sobrescribir fetch
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);

      // Si es un error 401 (no autenticado)
      if (response.status === 401 && !isRedirecting) {
        const url = args[0] as string;
        
        // Ignorar si ya estamos en login o es una ruta pública
        const currentPath = window.location.pathname;
        const isPublicRoute = 
          currentPath === '/login' ||
          currentPath === '/api-docs' ||
          currentPath.startsWith('/confirmar-anulacion');

        // Solo redirigir si no estamos en una ruta pública
        if (!isPublicRoute && !url.includes('/login')) {
          isRedirecting = true;

          // Intentar leer el mensaje de error
          const clonedResponse = response.clone();
          try {
            const data = await clonedResponse.json();
            
            // Verificar si es un error de sesión expirada
            if (data.code === 'NO_TOKEN' || data.code === 'INVALID_TOKEN' || data.message?.toLowerCase().includes('sesion')) {
              // Mostrar notificación
              const { toast } = await import('sonner');
              toast.error('Sesión expirada', {
                description: 'Debe ingresar con código de verificación',
                duration: 3000,
              });

              // Redirigir al login después de un breve delay
              setTimeout(() => {
                const loginUrl = `/login?redirect=${encodeURIComponent(currentPath)}`;
                window.location.href = loginUrl;
              }, 500);
            }
          } catch (e) {
            // Si no se puede leer el JSON, solo redirigir
            setTimeout(() => {
              const loginUrl = `/login?redirect=${encodeURIComponent(currentPath)}`;
              window.location.href = loginUrl;
            }, 500);
          }
        }
      }

      return response;
    } catch (error) {
      // Resetear flag en caso de error
      isRedirecting = false;
      throw error;
    }
  };
}

// Resetear el flag cuando se carga la página de login
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    if (window.location.pathname === '/login') {
      isRedirecting = false;
    }
  });
}
