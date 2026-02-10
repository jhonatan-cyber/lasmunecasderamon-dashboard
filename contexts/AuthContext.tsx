'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
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
  hasPermission: (module: string, action: string) => boolean;
  hasAnyPermission: (module: string) => boolean;
  hasAllPermissions: (module: string, actions: string[]) => boolean;
  refreshUser: () => Promise<void>;
  refreshPermissions: (forceRefresh?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  
  const userFetchedRef = useRef(false);
  const permissionsFetchedRef = useRef(false);
  const isFetchingUserRef = useRef(false);
  const isFetchingPermissionsRef = useRef(false);
  const sessionExpiredShownRef = useRef(false);
  const pendingPermissionsRefreshRef = useRef(false);

  // Páginas públicas que no requieren autenticación
  const isPublicPage = 
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
    userFetchedRef.current = false;
    permissionsFetchedRef.current = false;
    
    // Mostrar notificación
    toast.error('Sesión expirada', {
      description: 'Debe ingresar con código de verificación',
      duration: 3000,
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
          'Pragma': 'no-cache'
        },
        credentials: 'include',
        cache: 'no-store', // Forzar no usar caché
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
  const fetchPermissions = useCallback(async (forceRefresh = false) => {
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
          'Pragma': 'no-cache'
        },
        credentials: 'include',
        cache: 'no-store', // Forzar no usar caché
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
      setPermissionsLoading(false);
      isFetchingPermissionsRef.current = false;
      
      // Si hay un refresh pendiente, ejecutarlo
      if (pendingPermissionsRefreshRef.current) {
        pendingPermissionsRefreshRef.current = false;
        setTimeout(() => fetchPermissions(true), 50);
      }
    }
  }, [user?.id, user?.role, handleSessionExpired]);

  // Verificar si tiene un permiso específico
  const hasPermission = useCallback((module: string, action: string): boolean => {
    if (module === 'dashboard' || module === 'Dashboard') return true;
    if (user?.role?.toLowerCase() === 'administrador') return true;
    if (!userPermissions || userPermissions.length === 0) return false;
    
    return userPermissions.some(p => p.module === module && p.action === action);
  }, [userPermissions, user?.role]);

  // Verificar si tiene algún permiso en un módulo
  const hasAnyPermission = useCallback((module: string): boolean => {
    if (module === 'dashboard' || module === 'Dashboard') return true;
    if (user?.role?.toLowerCase() === 'administrador') return true;
    if (!userPermissions || userPermissions.length === 0) return false;
    
    return userPermissions.some(p => p.module === module);
  }, [userPermissions, user?.role]);

  // Verificar si tiene todos los permisos especificados
  const hasAllPermissions = useCallback((module: string, actions: string[]): boolean => {
    if (module === 'dashboard' || module === 'Dashboard') return true;
    if (user?.role?.toLowerCase() === 'administrador') return true;
    if (!userPermissions || userPermissions.length === 0) return false;
    
    return actions.every(action => 
      userPermissions.some(p => p.module === module && p.action === action)
    );
  }, [userPermissions, user?.role]);

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
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refreshUser: fetchUser,
    refreshPermissions: fetchPermissions,
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
