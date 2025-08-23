 'use client';
 
import { ReactNode, useState, useEffect } from 'react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Shield, AlertTriangle } from 'lucide-react';

interface PermissionGuardProps {
  children: ReactNode;
  module: string;
  action?: string;
  fallback?: ReactNode;
  requireAll?: boolean;
  actions?: string[];
}

export function PermissionGuard({ 
  children, 
  module, 
  action, 
  fallback,
  requireAll = false,
  actions = []
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading: permissionsLoading } = useUserPermissions();
  const { user, loading: userLoading } = useCurrentUser();

  // El administrador siempre tiene acceso a todo
  const isAdmin = user?.role?.toLowerCase() === 'administrador';

  // Evitar hydration mismatch: renderizar solo tras montar en el cliente
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  // Si es administrador, mostrar contenido inmediatamente
  if (isAdmin) {
    return <>{children}</>;
  }

  // Si está cargando el usuario o los permisos, mostrar loading
  if (userLoading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  let hasAccess = false;

  // El administrador siempre tiene acceso
  if (isAdmin) {
    hasAccess = true;
  } else if (requireAll && actions.length > 0) {
    hasAccess = hasAllPermissions(module, actions);
  } else if (action) {
    // Mapear acciones del PermissionGuard a acciones del sistema de permisos
    let mappedAction = action;
    let mappedModule = module;
    
    // Mapear módulos
    if (module === 'orders') mappedModule = 'pedidos';
    if (module === 'users') mappedModule = 'usuarios';
    if (module === 'clients') mappedModule = 'clientes';
    if (module === 'products') mappedModule = 'productos';
    if (module === 'categories') mappedModule = 'categorias';
    if (module === 'sales') mappedModule = 'ventas';
    if (module === 'roles') mappedModule = 'roles';
    if (module === 'cash_register') mappedModule = 'caja';
    if (module === 'payroll') mappedModule = 'pagos_trabajadores';
    if (module === 'payroll_details') mappedModule = 'detalle_planillas';
    if (module === 'private_rooms') mappedModule = 'privados';
    if (module === 'reports') mappedModule = 'reportes';
    
    // Mapear acciones
    if (action === 'view') mappedAction = 'ver';
    if (action === 'create') mappedAction = 'crear';
    if (action === 'edit') mappedAction = 'editar';
    if (action === 'delete') mappedAction = 'eliminar';
    if (action === 'process') mappedAction = 'procesar';
    if (action === 'close') mappedAction = 'cerrar';
    if (action === 'details') mappedAction = 'detalles';
    
    
    hasAccess = hasPermission(mappedModule, mappedAction);
  } else {
    hasAccess = hasAnyPermission(module);
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <Shield className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600 mb-4">
            No tienes permisos para acceder a esta funcionalidad.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Permisos requeridos:</p>
                <p className="mt-1">
                  Módulo: <span className="font-mono">{module}</span>
                  {module === 'orders' && <span className="text-xs text-gray-500"> (mapeado a 'pedidos')</span>}
                  {module === 'users' && <span className="text-xs text-gray-500"> (mapeado a 'usuarios')</span>}
                  {module === 'clients' && <span className="text-xs text-gray-500"> (mapeado a 'clientes')</span>}
                  {module === 'products' && <span className="text-xs text-gray-500"> (mapeado a 'productos')</span>}
                  {module === 'categories' && <span className="text-xs text-gray-500"> (mapeado a 'categorias')</span>}
                  {module === 'sales' && <span className="text-xs text-gray-500"> (mapeado a 'ventas')</span>}
                                     {module === 'cash_register' && <span className="text-xs text-gray-500"> (mapeado a 'caja')</span>}
                   {module === 'payroll' && <span className="text-xs text-gray-500"> (mapeado a 'pagos_trabajadores')</span>}
                   {module === 'payroll_details' && <span className="text-xs text-gray-500"> (mapeado a 'detalle_planillas')</span>}
                   {module === 'private_rooms' && <span className="text-xs text-gray-500"> (mapeado a 'privados')</span>}
                   {module === 'reports' && <span className="text-xs text-gray-500"> (mapeado a 'reportes')</span>}
                  {action && (
                    <>
                      <br />
                      Acción: <span className="font-mono">{action}</span>
                      {action === 'view' && <span className="text-xs text-gray-500"> (mapeado a 'ver')</span>}
                      {action === 'create' && <span className="text-xs text-gray-500"> (mapeado a 'crear')</span>}
                      {action === 'edit' && <span className="text-xs text-gray-500"> (mapeado a 'editar')</span>}
                      {action === 'delete' && <span className="text-xs text-gray-500"> (mapeado a 'eliminar')</span>}
                      {action === 'process' && <span className="text-xs text-gray-500"> (mapeado a 'procesar')</span>}
                      {action === 'close' && <span className="text-xs text-gray-500"> (mapeado a 'cerrar')</span>}
                      {action === 'details' && <span className="text-xs text-gray-500"> (mapeado a 'detalles')</span>}
                    </>
                  )}
                  {actions.length > 0 && (
                    <>
                      <br />
                      Acciones: <span className="font-mono">{actions.join(', ')}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
