import { isPublicRoute } from '@/lib/constants/routes';

let isRedirecting = false;

export function setupFetchInterceptor() {
  if (typeof window === 'undefined') return;
  const originalFetch = window.fetch;

  window.fetch = async (...args) => {
    let [input, init] = args;

    if (
      init &&
      ['POST', 'PUT', 'PATCH'].includes(init.method?.toUpperCase() || '') &&
      typeof init.body === 'string'
    ) {
      try {
        const bodyObj = JSON.parse(init.body);
        if (typeof bodyObj === 'object' && bodyObj !== null && !bodyObj.device_date) {
          bodyObj.device_date = new Date().toISOString();
          init.body = JSON.stringify(bodyObj);
        }
      } catch (e) {}
    }

    try {
      const response = await originalFetch(input, init);

      if (response.status === 401 && !isRedirecting) {
        const requestInput = args[0];
        const url =
          typeof requestInput === 'string'
            ? requestInput
            : requestInput instanceof Request
              ? requestInput.url
              : '';

        const currentPath = window.location.pathname;
        const isPublic =
          currentPath === '/' ||
          currentPath === '/login' ||
          currentPath === '/api-docs' ||
          isPublicRoute(currentPath) ||
          currentPath === '/asistencia-qr';

        if (!isPublic && !url.includes('/login')) {
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
          } catch {
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
