'use client';

import { useEffect, useState, useRef, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  PUBLIC_ROUTE_PATHS,
  accessDeniedPath,
  findRoutePermission,
  isAnySessionRoute,
  matchesRoutePath
} from '@/lib/constants/route-permissions';
import { Loader2 } from 'lucide-react';

interface RouteGuardProps {
  children: ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    user,
    userLoading,
    hasPermission,
    permissionsLoading,
    permissionsLoaded,
    refreshPermissions
  } = useAuth();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const routerRef = useRef(router);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    routerRef.current = router;
    pathnameRef.current = pathname;
  }, [router, pathname]);

  useEffect(() => {
    const checkAuth = async () => {
      const currentPathname = pathnameRef.current;

      if (
        currentPathname &&
        PUBLIC_ROUTE_PATHS.some(route => matchesRoutePath(currentPathname, route))
      ) {
        setAuthorized(true);
        setChecking(false);
        return;
      }

      if (userLoading) {
        return;
      }

      if (!user) {
        setChecking(false);
        routerRef.current.push(`/login?redirect=${encodeURIComponent(currentPathname || '/')}`);
        return;
      }

      if (user.role?.toLowerCase() === 'administrador') {
        setAuthorized(true);
        setChecking(false);
        return;
      }

      /*
       * La tabla de rutas es la misma que usa el middleware (`ROUTE_PERMISSIONS`, en
       * `lib/constants/route-permissions`): una sola lista de pares módulo/acción y un
       * solo criterio de coincidencia, así el cliente y el servidor no pueden decidir
       * distinto sobre la misma URL. Antes cada capa tenía su copia y se desincronizaron.
       */
      const requiredPermission = currentPathname ? findRoutePermission(currentPathname) : null;

      // Sin entrada en la tabla la página solo exige sesión; las rutas de rol
      // (`/garzon-*`, `/anfitriona-*`, `/cajero-*`) también pasan y filtran adentro.
      if (!requiredPermission || isAnySessionRoute(requiredPermission)) {
        setAuthorized(true);
        setChecking(false);
        return;
      }

      const { module, action } = requiredPermission;

      /*
       * Esperar a que la lista de permisos haya terminado de cargar antes de decidir.
       *
       * En una recarga completa (F5 o link directo) el usuario de la sesión llega antes
       * que sus permisos, y `permissionsLoading` todavía vale `false` porque es el estado
       * inicial del hook: el fetch aún no arrancó. Evaluar `hasPermission` en ese momento
       * daba `false` contra una lista vacía y mandaba a /access-denied a cuentas que sí
       * tenían el permiso, aunque el middleware las hubiera dejado pasar.
       *
       * `permissionsLoaded` es la señal real de "ya tengo la lista": la pone el `finally`
       * del fetch, así que también se cumple cuando la petición falla (401 o error de red),
       * sin dejar la pantalla colgada en "Verificando permisos...". Si nadie disparó la
       * carga todavía, la disparamos acá.
       */
      if (!permissionsLoaded) {
        if (!permissionsLoading) {
          void refreshPermissions();
        }
        return;
      }

      const hasAccess = hasPermission(module, action);

      if (!hasAccess) {
        setChecking(false);
        routerRef.current.push(accessDeniedPath(module, action));
        return;
      }

      setAuthorized(true);
      setChecking(false);
    };

    checkAuth();
  }, [user, userLoading, hasPermission, permissionsLoading, permissionsLoaded, refreshPermissions]);

  if (checking || userLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-gray-50 dark:bg-neutral-900'>
        <div className='text-center'>
          <Loader2 className='h-8 w-8 animate-spin text-blue-600 mx-auto mb-4' />
          <p className='text-gray-600 dark:text-neutral-400'>Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}
