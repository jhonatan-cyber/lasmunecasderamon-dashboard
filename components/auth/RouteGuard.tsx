'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Shield, Loader2 } from 'lucide-react';

interface RouteGuardProps {
  children: ReactNode;
}

// Mapeo de rutas a módulos y acciones requeridas
const routePermissions: Record<string, { module: string; action: string }> = {
  '/dashboard': { module: 'dashboard', action: 'view' },
  '/users': { module: 'usuarios', action: 'listar' },
  '/clients': { module: 'clientes', action: 'listar' },
  '/products': { module: 'productos', action: 'listar_categoria' },
  '/categories': { module: 'categorias', action: 'listar' },
  '/orders': { module: 'pedidos', action: 'listar' },
  '/sales': { module: 'ventas', action: 'listar' },
  '/reports': { module: 'reportes', action: 'listar' },
  '/roles': { module: 'roles', action: 'listar' },
  '/attendance': { module: 'asistencias', action: 'listar' },
  '/overtime': { module: 'horas_extras', action: 'listar' },
  '/cash-register': { module: 'caja', action: 'listar' },
  '/accounts': { module: 'cuentas', action: 'listar' },
  '/tips': { module: 'propinas', action: 'listar' },
  '/commissions': { module: 'comisiones', action: 'listar' },
  '/payroll': { module: 'payroll', action: 'listar' },
  '/payroll/calendar': { module: 'detalle_planilla', action: 'listar' },
  '/advances': { module: 'anticipos', action: 'listar' },
  '/returns': { module: 'devoluciones', action: 'listar' },
  '/rooms': { module: 'habitaciones', action: 'listar' },
  '/private-rooms': { module: 'privados', action: 'listar' },
  '/settings': { module: 'configuraciones', action: 'listar' }
};

// Rutas públicas que no requieren autenticación
const publicRoutes = [
  '/login',
  '/landing',
  '/politica-de-privacidad',
  '/terminos-y-condiciones',
  '/access-denied'
];

export function RouteGuard({ children }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: userLoading } = useCurrentUser();
  const { hasPermission, isLoading: permissionsLoading } = useUserPermissions();
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

      console.log('[RouteGuard] Verificando ruta:', {
        pathname,
        matchedRoute: requiredPermission[0],
        module,
        action
      });

      // Si aún están cargando los permisos, esperar
      if (permissionsLoading) {
        return;
      }

      // Verificar si el usuario tiene el permiso
      const hasAccess = hasPermission(module, action);

      console.log('[RouteGuard] Resultado:', {
        hasAccess,
        module,
        action,
        willRedirect: !hasAccess
      });

      if (!hasAccess) {
        // Redirigir a página de acceso denegado
        router.push('/access-denied');
        return;
      }

      setAuthorized(true);
      setChecking(false);
    };

    checkAuth();
  }, [pathname, user, userLoading, permissionsLoading, hasPermission, router]);

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
