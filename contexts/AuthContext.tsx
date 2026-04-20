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
import { useSharedSSE } from '@/hooks/shared/useSharedSSE';
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
  refreshUser: (silent?: boolean) => Promise<void>;
  refreshPermissions: (forceRefresh?: boolean) => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
// Modulos equivalentes en ingles (como usa la app) vs espaÃ±ol (como estÃ¡n en la BD)
const moduleMap: Record<string, string[]> = {
  users: ['usuarios', 'users'],
  clients: ['clientes', 'clients'],
  products: ['productos', 'products'],
  categories: ['categorias', 'categories'],
  orders: ['pedidos', 'orders'],
  reports: ['reportes', 'reports'],
  sales: ['ventas', 'sales'],
  attendance: ['asistencias', 'attendance'],
  overtime: ['horas_extras', 'overtime'],
  gratificaciones: ['gratificaciones', 'gratificaciones'],
  cash_register: ['caja', 'cash_register'],
  accounts: ['cuentas', 'accounts'],
  tips: ['propinas', 'tips'],
  commissions: ['comisiones', 'commissions'],
  payroll: ['pagos_trabajadores', 'payroll'],
  payroll_details: ['payroll_details'],
  advances: ['anticipos', 'advances'],
  returns: ['devoluciones', 'returns'],
  roles: ['roles'],
  rooms: ['rooms'],
  private_rooms: ['private_rooms']
};
const actionMap: Record<string, string[]> = {
  view: [
    'view',
    'listar_usuarios',
    'listar_clientes',
    'listar_categoria_productos',
    'listar_productos_categoria',
    'listar_categorias',
    'listar_pedidos',
    'listar_reportes',
    'listar_ventas',
    'listar_roles',
    'listar_asistencias',
    'listar_horas_extras',
    'listar_gratificaciones',
    'listar_caja',
    'listar_cuentas',
    'listar_propinas',
    'listar_comisiones',
    'listar_pagos',
    'listar_detalles',
    'listar_anticipos',
    'listar_devoluciones',
    'listar_habitaciones',
    'listar_privados',
    'ver_detalles',
    'ver_dashboard'
  ],
  create: ['create', 'crear', 'agregar_productos'],
  process: ['process', 'registar_venta', 'registar_cuenta'],
  edit: ['edit', 'editar', 'registar_venta', 'registar_cuenta', 'process'],
  delete: ['delete', 'eliminar', 'anular']
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
  const isMountedRef = useRef(true);
  // Páginas públicas que no requieren autenticación.
  // OJO: pathname nulo NO debe tratarse como público; si no, la sesión no arranca
  // y el guard puede quedar clavado en 'Verificando permisos...'.
  const isPublicPage =
    pathname === '/' ||
    pathname === '/landing' ||
    pathname === '/terminos-y-condiciones' ||
    pathname === '/politica-de-privacidad' ||
    pathname === '/login' ||
    pathname === '/api-docs' ||
    pathname === '/confirmar-anulacion' ||
    pathname === '/confirmar-anulacion-servicio';
  // Manejar sesiÃ³n expirada
  const handleSessionExpired = useCallback(() => {
    // Evitar mostrar mÃºltiples notificaciones
    if (sessionExpiredShownRef.current) return;
    sessionExpiredShownRef.current = true;
    // Limpiar estado
    setUser(null);
    setUserPermissions([]);
    setPermissionsLoaded(false);
    userFetchedRef.current = false;
    permissionsFetchedRef.current = false;
    // Guardar hint persistente del rol para navegaciÃ³n rÃ¡pida
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_role_hint');
    }
    // Mostrar notificaciÃ³n
    toast.error('SesiÃ³n expirada', {
      description: 'Debe ingresar con cÃ³digo de verificaciÃ³n',
      duration: 3000
    });
    // Redirigir al login despuÃ©s de un breve delay
    setTimeout(() => {
      router.push(`/login?redirect=${encodeURIComponent(pathname || '')}`);
      sessionExpiredShownRef.current = false;
    }, 500);
  }, [pathname, router]);
  // Fetch del usuario actual
  const fetchUser = useCallback(
    async (silent = false) => {
      if (!isMountedRef.current || isPublicPage || isFetchingUserRef.current) return;
      isFetchingUserRef.current = true;
      if (!silent || !user) {
        setUserLoading(true);
      }
      try {
        // Agregar timestamp para evitar cachÃ© del navegador
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/auth/me?t=${timestamp}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache'
          },
          credentials: 'include',
          cache: 'no-store' // Forzar no usar cachÃ©
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.user) {
            setUser(result.user);
            // Guardar hint persistente del rol para navegaciÃ³n rÃ¡pida
            if (typeof window !== 'undefined') {
              localStorage.setItem('auth_role_hint', result.user.role?.toLowerCase() || '');
            }
            userFetchedRef.current = true;
          } else if (!result.success) {
            // SesiÃ³n invÃ¡lida o expirada
            handleSessionExpired();
          }
        } else if (response.status === 401) {
          // No autenticado o sesiÃ³n expirada
          handleSessionExpired();
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setUserLoading(false);
        isFetchingUserRef.current = false;
      }
    },
    [handleSessionExpired, isPublicPage, user]
  );
  // Fetch de permisos del usuario
  const fetchPermissions = useCallback(
    async (forceRefresh = false) => {
      if (!isMountedRef.current || !user?.id || user.role?.toLowerCase() === 'administrador') {
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
        // Agregar timestamp para evitar cachÃ© del navegador
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/users/${user.id}/permissions?t=${timestamp}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache'
          },
          credentials: 'include',
          cache: 'no-store' // Forzar no usar cachÃ©
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // Solo actualizar si estÃ¡ montado
            if (isMountedRef.current) {
              setUserPermissions([...result.data]);
            }
            permissionsFetchedRef.current = true;
          }
        } else if (response.status === 401) {
          // SesiÃ³n expirada mientras se cargaban permisos
          handleSessionExpired();
        }
      } catch (error) {
        console.error('âŒ [AuthContext] Error fetching permissions:', error);
      } finally {
        setPermissionsLoaded(true);
        setPermissionsLoading(false);
        isFetchingPermissionsRef.current = false;
        // Si hay un refresh pendiente, ejecutarlo
        if (pendingPermissionsRefreshRef.current && isMountedRef.current) {
          pendingPermissionsRefreshRef.current = false;
          setTimeout(() => fetchPermissions(true), 50);
        }
      }
    },
    [handleSessionExpired, user?.id, user?.role]
  );
  const hasPermission = useCallback(
    (module: string, action: string): boolean => {
      if (module === 'dashboard' || module === 'Dashboard') return true;
      if (user?.role?.toLowerCase() === 'administrador') return true;
      if (!userPermissions || userPermissions.length === 0) {
        return false;
      }
      // Match exacto primero
      let match = userPermissions.some(p => p.module === module && p.action === action);
      if (match) {
        return true;
      }
      // Buscar alias si no hay match
      const allowedModules = moduleMap[module] || [module];
      const allowedActions = actionMap[action] || [action];
      return userPermissions.some(
        p => allowedModules.includes(p.module) && allowedActions.includes(p.action)
      );
    },
    [userPermissions, user?.role]
  );
  // Verificar si tiene algÃºn permiso en un mÃ³dulo
  const hasAnyPermission = useCallback(
    (module: string): boolean => {
      if (module === 'dashboard' || module === 'Dashboard') return true;
      if (user?.role?.toLowerCase() === 'administrador') return true;
      if (!userPermissions || userPermissions.length === 0) return false;
      const allowedModules = moduleMap[module] || [module];
      const match = userPermissions.some(p => allowedModules.includes(p.module));
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
        return userPermissions.some(
          p => allowedModules.includes(p.module) && allowedActions.includes(p.action)
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
  // Cargar permisos cuando el usuario estÃ© disponible (solo una vez)
  useEffect(() => {
    if (user && !permissionsFetchedRef.current && user.role?.toLowerCase() !== 'administrador') {
      fetchPermissions();
    }
  }, [user, fetchPermissions]);
  // Cleanup al desmontar para evitar actualizaciones de estado en componentes desmontados
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  const sseUrl = isPublicPage || !user ? null : '/api/notifications/sse';
  useSharedSSE(sseUrl, async payload => {
    if (!user || !payload || payload.type === 'connected') return;
    const rolesAfectados = ['cajero', 'garzon', 'anfitriona'];
    const rolUsuario = user.role?.toLowerCase();
    const doLogout = (message: string) => {
      toast.warning('Sesion cerrada', { description: message, duration: 6000 });
      document.cookie = 'token=; Max-Age=0; path=/';
      setUser(null);
      setUserPermissions([]);
      setPermissionsLoaded(false);
      userFetchedRef.current = false;
      permissionsFetchedRef.current = false;
      setTimeout(() => router.push('/login'), 2000);
    };
    if (payload.type === 'permissions-updated' && rolUsuario !== 'administrador') {
      const affectsCurrentUser =
        payload.roleId === user.roleId || payload.userId === user.id || !payload.roleId;
      if (affectsCurrentUser) {
        fetchPermissions(true);
        toast.success('Permisos actualizados', { duration: 3000 });
      }
      return;
    }
    if (payload.type === 'role-deleted' && payload.roleId === user.roleId) {
      toast.error('Tu rol ha sido eliminado', {
        description: 'Seras redirigido al login',
        duration: 3000
      });
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
      return;
    }
    if (payload.type === 'force_logout' && payload.data?.userId === user.id) {
      doLogout(payload.data.message || 'Ingresa nuevamente para registrar tu asistencia.');
      return;
    }
    if (payload.type === 'check_attendance' && rolesAfectados.includes(rolUsuario)) {
      try {
        const res = await fetch('/api/asistencias/hoy', { credentials: 'include' });
        const data = await res.json();
        if (!data.registrada) {
          doLogout('No registraste tu asistencia hoy. Ingresa nuevamente para registrarla.');
        }
      } catch {
        // ignorar error puntual de verificacion
      }
    }
  });
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

