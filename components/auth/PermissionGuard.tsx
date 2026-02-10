'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
  const { user, userLoading, hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  // Evitar hydration mismatch: renderizar solo tras montar en el cliente
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return null;
  }

  // Mostrar loading mientras se carga el usuario
  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // El administrador siempre tiene acceso a todo
  const isAdmin = user?.role?.toLowerCase() === 'administrador';

  // El dashboard es accesible para todos los usuarios autenticados
  const isDashboardModule = module === 'dashboard' || module === 'Dashboard';

  // Si es administrador o es el módulo dashboard, mostrar contenido inmediatamente
  if (isAdmin || isDashboardModule) {
    return <>{children}</>;
  }

  let hasAccess = false;

  if (requireAll && actions.length > 0) {
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
    if (module === 'payroll') mappedModule = 'payroll';
    if (module === 'payroll_details') mappedModule = 'detalle_planilla';
    if (module === 'private_rooms') mappedModule = 'privados';
    if (module === 'reports') mappedModule = 'reportes';
    if (module === 'anticipos') mappedModule = 'anticipos';
    if (module === 'devoluciones') mappedModule = 'devoluciones';
    if (module === 'habitaciones') mappedModule = 'habitaciones';
    if (module === 'configuraciones') mappedModule = 'configuraciones';
    
    // Mapear acciones
    if (action === 'view') mappedAction = 'listar';
    if (action === 'create') mappedAction = 'crear';
    if (action === 'edit') mappedAction = 'editar';
    if (action === 'delete') mappedAction = 'eliminar';
    if (action === 'process') mappedAction = 'procesar';
    if (action === 'close') mappedAction = 'cerrar';
    if (action === 'details') mappedAction = 'ver_detalles';
    if (action === 'activate') mappedAction = 'activar';
    if (action === 'deactivate') mappedAction = 'desactivar';
    if (action === 'listar') mappedAction = 'listar';
    if (action === 'pagar') mappedAction = 'pagar';
    if (action === 'finalizar') mappedAction = 'finalizar';
    if (action === 'liberar') mappedAction = 'liberar';
    if (action === 'ocupar') mappedAction = 'ocupar';
    
    hasAccess = hasPermission(mappedModule, mappedAction);
  } else {
    hasAccess = hasAnyPermission(module);
  }

  if (!hasAccess) {
    if (fallback !== undefined) {
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
                  {action && (
                    <>
                      <br />
                      Acción: <span className="font-mono">{action}</span>
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
