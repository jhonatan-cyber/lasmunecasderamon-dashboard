'use client';

import { useEffect, useState, useRef, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface RouteGuardProps {
  children: ReactNode;
}

const routePermissions: Record<string, { module: string; action: string }> = {
  '/dashboard': { module: 'dashboard', action: 'view' },
  '/users': { module: 'users', action: 'view' },
  '/clients': { module: 'clients', action: 'view' },
  '/products': { module: 'products', action: 'view' },
  '/categories': { module: 'categories', action: 'view' },
  '/orders': { module: 'orders', action: 'view' },
  '/sales': { module: 'sales', action: 'view' },
  '/reports': { module: 'reports', action: 'view' },
  '/roles': { module: 'roles', action: 'view' },
  '/attendance': { module: 'attendance', action: 'view' },
  '/overtime': { module: 'overtime', action: 'view' },
  '/gratificaciones': { module: 'gratificaciones', action: 'view' },
  '/cash-register': { module: 'cash_register', action: 'view' },
  '/accounts': { module: 'accounts', action: 'view' },
  '/tips': { module: 'tips', action: 'view' },
  '/commissions': { module: 'commissions', action: 'view' },
  '/payroll': { module: 'payroll', action: 'view' },
  '/payroll/calendar': { module: 'payroll_details', action: 'view' },
  '/advances': { module: 'advances', action: 'view' },
  '/returns': { module: 'returns', action: 'view' },
  '/rooms': { module: 'rooms', action: 'view' },
  '/private-rooms': { module: 'private_rooms', action: 'view' },
  '/settings': { module: 'settings', action: 'view' }
};

const publicRoutes = ['/', '/login', '/access-denied'];

export function RouteGuard({ children }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userLoading, hasPermission, permissionsLoading, permissionsLoaded } = useAuth();
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
        publicRoutes.some(route =>
          route === '/'
            ? currentPathname === route
            : currentPathname === route || currentPathname.startsWith(route + '/')
        )
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

      if (permissionsLoading) {
        return;
      }

      const sortedRoutes = Object.entries(routePermissions).sort(
        (a, b) => b[0].length - a[0].length
      );

      const requiredPermission = sortedRoutes.find(
        ([route]) =>
          currentPathname && (currentPathname === route || currentPathname.startsWith(route + '/'))
      );

      if (!requiredPermission) {
        setAuthorized(true);
        setChecking(false);
        return;
      }

      const [, { module, action }] = requiredPermission;

      if (module === 'dashboard') {
        setAuthorized(true);
        setChecking(false);
        return;
      }

      const hasAccess = hasPermission(module, action);

      if (!hasAccess) {
        setChecking(false);
        routerRef.current.push(`/access-denied?module=${module}&action=${action}`);
        return;
      }

      setAuthorized(true);
      setChecking(false);
    };

    checkAuth();
  }, [user, userLoading, hasPermission, permissionsLoading, permissionsLoaded]);

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
