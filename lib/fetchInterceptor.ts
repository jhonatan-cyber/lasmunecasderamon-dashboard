let isRedirecting = false;

export function setupFetchInterceptor() {
  if (typeof window === 'undefined') return;
  const originalFetch = window.fetch;

  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);

      if (response.status === 401 && !isRedirecting) {
        const url = args[0] as string;

        const currentPath = window.location.pathname;
        const isPublicRoute =
          currentPath === '/' ||
          currentPath === '/landing' ||
          currentPath === '/login' ||
          currentPath === '/api-docs' ||
          currentPath === '/terminos-y-condiciones' ||
          currentPath === '/politica-de-privacidad' ||
          currentPath.startsWith('/confirmar-anulacion');

        if (!isPublicRoute && !url.includes('/login')) {
          isRedirecting = true;
          const clonedResponse = response.clone();
          try {
            const data = await clonedResponse.json();
            if (
              data.code === 'NO_TOKEN' ||
              data.code === 'INVALID_TOKEN' ||
              data.message?.toLowerCase().includes('sesion')
            ) {
              const { toast } = await import('sonner');
              toast.error('Sesión expirada', {
                description: 'Debe ingresar con código de verificación',
                duration: 3000
              });

              setTimeout(() => {
                const loginUrl = `/login?redirect=${encodeURIComponent(currentPath)}`;
                window.location.href = loginUrl;
              }, 500);
            }
          } catch (e) {
            setTimeout(() => {
              const loginUrl = `/login?redirect=${encodeURIComponent(currentPath)}`;
              window.location.href = loginUrl;
            }, 500);
          }
        }
      }

      return response;
    } catch (error) {
      isRedirecting = false;
      throw error;
    }
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    if (window.location.pathname === '/login') {
      isRedirecting = false;
    }
  });
}
