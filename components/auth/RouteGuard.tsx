/* eslint-disable */
'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface RouteGuardProps {
  children: ReactNode;
}

// Mapeo de rutas a módulos y acciones requeridas
// IMPORTANTE: Los nombres de módulos y acciones deben coincidir con la tabla 'permissions' en la BD
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

// Rutas públicas que no requieren autenticación
const publicRoutes = [
  '/',
  '/login',
  '/landing',
  '/politica-de-privacidad',
  '/terminos-y-condiciones',
  '/access-denied'
];

export function RouteGuard({ children }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userLoading, userPermissions, permissionsLoading, permissionsLoaded, hasPermission } = useAuth();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Función para verificar autorización
    const checkAuth = () => {
      // Si es una ruta pública, permitir acceso
      if (pathname && publicRoutes.some(route => pathname === route || pathname.startsWith(route))) {
        setAuthorized(true);
        setChecking(false);
        return;
      }

      // Si está cargando el usuario, esperar
      if (userLoading) {
        return;
      }

      // Si no hay usuario, redirigir a login
      if (!user) {
        router.push(`/login?redirect=${encodeURIComponent(pathname || '/')}`);
        return;
      }

      // El administrador tiene acceso a todo
      if (user.role?.toLowerCase() === 'administrador') {
        setAuthorized(true);
        setChecking(false);
        return;
      }

      // IMPORTANTE: Esperar a que los permisos se carguen antes de verificar acceso
      if (permissionsLoading) {
        console.log('[RouteGuard] ⏳ Esperando a que se carguen los permisos...');
        return;
      }

      // Si no hay permisos cargados aún, esperar
      if (!permissionsLoaded) {
        console.log('[RouteGuard] ⏳ Permisos aún no cargados, esperando...');
        return;
      }

      console.log('[RouteGuard] ✅ Permisos cargados:', userPermissions.length);

      // Buscar el permiso requerido para la ruta actual
      // IMPORTANTE: Buscar la coincidencia MÁS ESPECÍFICA primero
      // Ordenar las rutas por longitud descendente para que /payroll/calendar se verifique antes que /payroll
      const sortedRoutes = Object.entries(routePermissions).sort((a, b) => b[0].length - a[0].length);

      const requiredPermission = sortedRoutes.find(([route]) =>
        pathname && (pathname === route || pathname.startsWith(route + '/'))
      );

      // Si no hay permiso definido para esta ruta, permitir acceso
      if (!requiredPermission) {
        setAuthorized(true);
        setChecking(false);
        return;
      }

      const [, { module, action }] = requiredPermission;

      console.log('[RouteGuard] 🔍 Verificando permiso:', { module, action, pathname });

      // Verificar si el usuario tiene el permiso
      const hasAccess = hasPermission(module, action);

      console.log('[RouteGuard] 🔑 Tiene acceso?', hasAccess);

      if (!hasAccess) {
        console.log('[RouteGuard] ❌ Acceso denegado, redirigiendo...');
        // Redirigir a página de acceso denegado
        router.push(`/access-denied?module=${module}&action=${action}`);
        return;
      }

      setAuthorized(true);
      setChecking(false);
    };

    checkAuth();
  }, [pathname, user, userLoading, userPermissions, permissionsLoading, permissionsLoaded, hasPermission, router]);

  // Mostrar loading mientras se verifica
  if (checking || userLoading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-neutral-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-neutral-400">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Si no está autorizado, no mostrar nada (ya se redirigió)
  if (!authorized) {
    return null;
  }

  // Si está autorizado, mostrar el contenido
  return <>{children}</>;
}
