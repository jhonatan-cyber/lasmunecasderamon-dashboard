'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface CurrentUser {
  id: number;
  name: string;
  lastName: string;
  email?: string;
  role: string;
  roleId?: number; // ID del rol para comparar con SSE
  status: number;
  foto?: string;
  username?: string;
  permissions?: any;
  phone?: string;
  address?: string;
  fecha_crea?: string;
}

interface UserPermission {
  id: number;
  name: string;
  description: string;
  module: string;
  action: string;
}

interface AuthContextType {
  user: CurrentUser | null;
  userLoading: boolean;
  userPermissions: UserPermission[];
  permissionsLoading: boolean;
  permissionsLoaded: boolean;
  hasPermission: (module: string, action: string) => boolean;
  hasAnyPermission: (module: string) => boolean;
  hasAllPermissions: (module: string, actions: string[]) => boolean;
  refreshUser: () => Promise<void>;
  refreshPermissions: (forceRefresh?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Modulos equivalentes en ingles (como usa la app) vs español (como están en la BD)
const moduleMap: Record<string, string[]> = {
  'users': ['usuarios', 'users'],
  'clients': ['clientes', 'clients'],
  'products': ['productos', 'products'],
  'categories': ['categorias', 'categories'],
  'orders': ['pedidos', 'orders'],
  'reports': ['reportes', 'reports'],
  'sales': ['ventas', 'sales'],
  'attendance': ['asistencias', 'attendance'],
  'overtime': ['horas_extras', 'overtime'],
  'cash_register': ['caja', 'cash_register'],
  'accounts': ['cuentas', 'accounts'],
  'tips': ['propinas', 'tips'],
  'commissions': ['comisiones', 'commissions'],
  'payroll': ['pagos_trabajadores', 'payroll'],
  'payroll_details': ['payroll_details'],
  'advances': ['anticipos', 'advances'],
  'returns': ['devoluciones', 'returns'],
  'roles': ['roles'],
  'rooms': ['rooms'],
  'private_rooms': ['private_rooms']
};

const actionMap: Record<string, string[]> = {
  'view': ['view', 'listar_usuarios', 'listar_clientes', 'listar_categoria_productos', 'listar_productos_categoria', 'listar_categorias', 'listar_pedidos', 'listar_reportes', 'listar_ventas', 'listar_roles', 'listar_asistencias', 'listar_horas_extras', 'listar_caja', 'listar_cuentas', 'listar_propinas', 'listar_comisiones', 'listar_pagos', 'listar_detalles', 'listar_anticipos', 'listar_devoluciones', 'listar_habitaciones', 'listar_privados', 'ver_detalles', 'ver_dashboard'],
  'create': ['create', 'crear', 'agregar_productos'],
  'process': ['process', 'registar_venta', 'registar_cuenta'],
  'edit': ['edit', 'editar', 'registar_venta', 'registar_cuenta', 'process'],
  'delete': ['delete', 'eliminar', 'anular']
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  const userFetchedRef = useRef(false);
  const permissionsFetchedRef = useRef(false);
  const isFetchingUserRef = useRef(false);
  const isFetchingPermissionsRef = useRef(false);
  const sessionExpiredShownRef = useRef(false);
  const pendingPermissionsRefreshRef = useRef(false);

  // Páginas públicas que no requieren autenticación
  const isPublicPage =
    pathname === '/' ||
    pathname === '/landing' ||
    pathname === '/terminos-y-condiciones' ||
    pathname === '/politica-de-privacidad' ||
    pathname === '/login' ||
    pathname === '/api-docs' ||
    pathname === '/confirmar-anulacion' ||
    pathname === '/confirmar-anulacion-servicio';

  // Manejar sesión expirada
  const handleSessionExpired = useCallback(() => {
    // Evitar mostrar múltiples notificaciones
    if (sessionExpiredShownRef.current) return;

    sessionExpiredShownRef.current = true;

    // Limpiar estado
    setUser(null);
    setUserPermissions([]);
    setPermissionsLoaded(false);
    userFetchedRef.current = false;
    permissionsFetchedRef.current = false;

    // Mostrar notificación
    toast.error('Sesión expirada', {
      description: 'Debe ingresar con código de verificación',
      duration: 3000
    });

    // Redirigir al login después de un breve delay
    setTimeout(() => {
      router.push(`/login?redirect=${encodeURIComponent(pathname || '')}`);
      sessionExpiredShownRef.current = false;
    }, 500);
  }, [pathname, router]);

  // Fetch del usuario actual
  const fetchUser = useCallback(async () => {
    if (isPublicPage || isFetchingUserRef.current) return;

    isFetchingUserRef.current = true;
    setUserLoading(true);

    try {
      // Agregar timestamp para evitar caché del navegador
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/auth/me?t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache'
        },
        credentials: 'include',
        cache: 'no-store' // Forzar no usar caché
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.user) {
          setUser(result.user);
          userFetchedRef.current = true;
        } else if (!result.success) {
          // Sesión inválida o expirada
          handleSessionExpired();
        }
      } else if (response.status === 401) {
        // No autenticado o sesión expirada
        handleSessionExpired();
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setUserLoading(false);
      isFetchingUserRef.current = false;
    }
  }, [isPublicPage]);

  // Fetch de permisos del usuario
  const fetchPermissions = useCallback(
    async (forceRefresh = false) => {
      if (!user?.id || user.role?.toLowerCase() === 'administrador') {
        return;
      }

      if (isFetchingPermissionsRef.current) {
        if (forceRefresh) {
          pendingPermissionsRefreshRef.current = true;
        }
        return;
      }

      isFetchingPermissionsRef.current = true;
      setPermissionsLoading(true);

      try {
        // Agregar timestamp para evitar caché del navegador
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/users/${user.id}/permissions?t=${timestamp}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache'
          },
          credentials: 'include',
          cache: 'no-store' // Forzar no usar caché
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            console.log('✅ [AuthContext] Permisos recibidos:', result.data.length);
            // Crear un nuevo array para forzar re-render
            setUserPermissions([...result.data]);
            permissionsFetchedRef.current = true;
          }
        } else if (response.status === 401) {
          // Sesión expirada mientras se cargaban permisos
          handleSessionExpired();
        }
      } catch (error) {
        console.error('❌ [AuthContext] Error fetching permissions:', error);
      } finally {
        setPermissionsLoaded(true);
        setPermissionsLoading(false);
        isFetchingPermissionsRef.current = false;

        // Si hay un refresh pendiente, ejecutarlo
        if (pendingPermissionsRefreshRef.current) {
          pendingPermissionsRefreshRef.current = false;
          setTimeout(() => fetchPermissions(true), 50);
        }
      }
    },
    [user?.id, user?.role, handleSessionExpired]
  );

  const hasPermission = useCallback(
    (module: string, action: string): boolean => {
      console.log(`[PermissionCheck] Checking ${module}.${action} for user ${user?.role}`);
      if (module === 'dashboard' || module === 'Dashboard') return true;
      if (user?.role?.toLowerCase() === 'administrador') return true;
      if (!userPermissions || userPermissions.length === 0) {
        console.log(`[PermissionCheck] User has no permissions`);
        return false;
      }

      // Match exacto primero
      let match = userPermissions.some(p => p.module === module && p.action === action);
      if (match) {
        console.log(`[PermissionCheck] Exact match found for ${module}.${action}`);
        return true;
      }

      // Buscar alias si no hay match
      const allowedModules = moduleMap[module] || [module];
      const allowedActions = actionMap[action] || [action];

      const aliasMatch = userPermissions.some(p =>
        allowedModules.includes(p.module) &&
        allowedActions.includes(p.action)
      );

      console.log(`[PermissionCheck] Alias match for ${module}.${action}: ${aliasMatch}`);

      return aliasMatch;
    },
    [userPermissions, user?.role]
  );

  // Verificar si tiene algún permiso en un módulo
  const hasAnyPermission = useCallback(
    (module: string): boolean => {
      if (module === 'dashboard' || module === 'Dashboard') return true;
      if (user?.role?.toLowerCase() === 'administrador') return true;
      if (!userPermissions || userPermissions.length === 0) return false;

      const allowedModules = moduleMap[module] || [module];
      const match = userPermissions.some(p => allowedModules.includes(p.module));
      console.log(`[PermissionCheck] Any check for ${module}: ${match}`);
      return match;
    },
    [userPermissions, user?.role]
  );

  // Verificar si tiene todos los permisos especificados
  const hasAllPermissions = useCallback(
    (module: string, actions: string[]): boolean => {
      if (module === 'dashboard' || module === 'Dashboard') return true;
      if (user?.role?.toLowerCase() === 'administrador') return true;
      if (!userPermissions || userPermissions.length === 0) return false;

      const allowedModules = moduleMap[module] || [module];

      return actions.every(action => {
        const allowedActions = actionMap[action] || [action];
        return userPermissions.some(p =>
          allowedModules.includes(p.module) &&
          allowedActions.includes(p.action)
        );
      });
    },
    [userPermissions, user?.role]
  );

  // Cargar usuario al montar (solo una vez)
  useEffect(() => {
    if (!isPublicPage && !userFetchedRef.current) {
      fetchUser();
    }
  }, [isPublicPage, fetchUser]);

  // Cargar permisos cuando el usuario esté disponible (solo una vez)
  useEffect(() => {
    if (user && !permissionsFetchedRef.current && user.role?.toLowerCase() !== 'administrador') {
      fetchPermissions();
    }
  }, [user, fetchPermissions]);

  // NOTA: La escucha de eventos de permisos se maneja en usePermissionsSSE
  // que recarga la página automáticamente cuando cambian los permisos.
  // No necesitamos escuchar eventos aquí para evitar duplicación.

  const value: AuthContextType = {
    user,
    userLoading,
    userPermissions,
    permissionsLoading,
    permissionsLoaded,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refreshUser: fetchUser,
    refreshPermissions: fetchPermissions
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
