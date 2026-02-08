import { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle,
  XCircle,
  Save,
  Loader2,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePermissions, Permission } from '@/hooks/usePermissions';
import { Role } from '@/hooks/useRoles';
import { showSuccessToast, showErrorToast } from '@/lib/toastUtils';
import { useUserPermissions } from '@/hooks/useUserPermissions';

interface PermissionsPanelProps {
  selectedRole: Role | null;
}

export function PermissionsPanel({ selectedRole }: PermissionsPanelProps) {
  const { permissionsByModule, getRolePermissions, updateRolePermissions } = usePermissions();
  const { hasPermission } = useUserPermissions();
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  
  // Verificar permiso para asignar permisos
  const canAssignPermissions = hasPermission('roles', 'asignar_permisos');

  // Cargar permisos del rol cuando se selecciona uno
  useEffect(() => {
    if (selectedRole) {
      loadRolePermissions(selectedRole.id);
    } else {
      setRolePermissions([]);
      setSelectedPermissions([]);
    }
  }, [selectedRole]);

  // Sincronizar selectedPermissions cuando cambian los permisos del rol
  useEffect(() => {
    if (rolePermissions.length > 0) {
      const assignedPermissionIds = rolePermissions
        .filter((p: Permission) => p.assigned === true)
        .map((p: Permission) => p.id.toString());

      setSelectedPermissions(assignedPermissionIds);
    }
  }, [rolePermissions]);

  const loadRolePermissions = async (roleId: number) => {
    setIsLoading(true);
    try {
      const permissions = await getRolePermissions(roleId.toString());

      setRolePermissions(permissions);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error al cargar los permisos del rol';
      showErrorToast(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(id => id !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;

    setIsSaving(true);
    try {
      // Guardar una copia del estado actual antes de enviar
      const permissionsToSave = [...selectedPermissions];

      const result = await updateRolePermissions(selectedRole.id.toString(), permissionsToSave);

      showSuccessToast('Permisos actualizados correctamente');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error al actualizar los permisos';
      showErrorToast(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectAllModule = (module: string) => {
    const modulePermissions = permissionsByModule[module] || [];
    const modulePermissionIds = modulePermissions.map(p => p.id.toString());

    setSelectedPermissions(prev => {
      const otherModules = prev.filter(id => !modulePermissionIds.includes(id));
      return [...otherModules, ...modulePermissionIds];
    });
  };

  const handleDeselectAllModule = (module: string) => {
    const modulePermissions = permissionsByModule[module] || [];
    const modulePermissionIds = modulePermissions.map(p => p.id.toString());

    setSelectedPermissions(prev => prev.filter(id => !modulePermissionIds.includes(id)));
  };

  const toggleModuleExpansion = (module: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(module)) {
        newSet.delete(module);
      } else {
        newSet.add(module);
      }
      return newSet;
    });
  };

  const expandAllModules = () => {
    const allModules = Object.keys(permissionsByModule).sort((a, b) =>
      getModuleDisplayName(a).localeCompare(getModuleDisplayName(b))
    );
    setExpandedModules(new Set(allModules));
  };

  const collapseAllModules = () => {
    setExpandedModules(new Set());
  };

  const getModuleDisplayName = (module: string): string => {
    const moduleNames: { [key: string]: string } = {
      accounts: 'Cuentas',
      advances: 'Anticipos',
      attendance: 'Asistencias',
      cash_register: 'Caja',
      categories: 'Categorías',
      commissions: 'Comisiones',
      overtime: 'Horas Extras',
      orders: 'Pedidos',
      payroll: 'Pagos Trabajadores',
      products: 'Productos',
      reports: 'Reportes',
      returns: 'Devoluciones',
      roles: 'Roles',
      sales: 'Ventas',
      services: 'Servicios',
      settings: 'Configuración',
      tips: 'Propinas',
      users: 'Usuarios',
      caja: 'Caja',
      pagos_trabajadores: 'Pagos a Trabajadores',
      detalle_planillas: 'Detalle Planillas',
      privados: 'Privados',
      reportes: 'Reportes',
      cash_box: 'Caja',
      worker_payments: 'Pagos a Trabajadores',
      payroll_details: 'Detalle Planillas',
      private: 'Privados'
    };

    return moduleNames[module] || module.replace('_', ' ');
  };

  if (!selectedRole) {
    return (
      <div className='flex flex-col items-center justify-center h-full text-center p-6'>
        <Shield className='h-12 w-12 text-zinc-400 dark:text-neutral-500 mb-4' />
        <h3 className='text-lg font-medium text-zinc-600 dark:text-neutral-300 mb-2'>
          Selecciona un rol
        </h3>
        <p className='text-sm text-zinc-500 dark:text-neutral-400'>
          Selecciona un rol para gestionar sus permisos
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='flex flex-col items-center justify-center h-full'>
        <Loader2 className='h-8 w-8 animate-spin text-zinc-600 dark:text-neutral-400 mb-4' />
        <p className='text-sm text-zinc-600 dark:text-neutral-400'>Cargando permisos...</p>
      </div>
    );
  }

  return (
    <div className='h-full bg-white dark:bg-neutral-900 flex flex-col'>
      {/* Header fijo */}
      <div className='flex-shrink-0 bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800 p-4'>
        <div className='flex items-center justify-between mb-4'>
          <div>
            <h3 className='text-lg font-semibold text-zinc-900 dark:text-neutral-100'>
              Permisos del Rol
            </h3>
            <p className='text-sm text-zinc-600 dark:text-neutral-400'>{selectedRole.name}</p>
          </div>
          {canAssignPermissions && (
            <Button
              onClick={handleSavePermissions}
              disabled={isSaving}
              className='bg-black text-white hover:bg-zinc-900 rounded-full'
            >
              {isSaving ? (
                <Loader2 className='h-4 w-4 animate-spin mr-2' />
              ) : (
                <Save className='h-4 w-4 mr-2' />
              )}
              Guardar
            </Button>
          )}
        </div>

        {/* Controles de expansión */}
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={expandAllModules} className='text-xs rounded-full'>
            <ChevronDown className='h-3 w-3 mr-1' />
            Expandir Todo
          </Button>
          <Button variant='outline' size='sm' onClick={collapseAllModules} className='text-xs rounded-full'>
            <ChevronRight className='h-3 w-3 mr-1' />
            Colapsar Todo
          </Button>
        </div>
      </div>

      {/* Contenido scrolleable */}
      <div className='flex-1 overflow-y-auto p-4 space-y-4'>
        {Object.entries(permissionsByModule)
          .sort(([a], [b]) => getModuleDisplayName(a).localeCompare(getModuleDisplayName(b)))
          .map(([module, permissions]) => {
            const isExpanded = expandedModules.has(module);
            const moduleSelectedCount = permissions.filter(p =>
              selectedPermissions.includes(p.id.toString())
            ).length;

            return (
              <div
                key={module}
                className='border border-gray-200 dark:border-neutral-800 rounded-lg overflow-hidden'
              >
                {/* Header del módulo */}
                <div
                  className='flex items-center justify-between p-3 bg-zinc-50 dark:bg-neutral-800 hover:bg-zinc-100 dark:hover:bg-neutral-700 cursor-pointer transition-colors'
                  onClick={() => toggleModuleExpansion(module)}
                >
                  <div className='flex items-center gap-2'>
                    {isExpanded ? (
                      <ChevronDown className='h-4 w-4 text-zinc-600 dark:text-neutral-400' />
                    ) : (
                      <ChevronRight className='h-4 w-4 text-zinc-600 dark:text-neutral-400' />
                    )}
                    <h4 className='font-medium text-zinc-800 dark:text-neutral-200 capitalize'>
                      {getModuleDisplayName(module)}
                    </h4>
                    <Badge variant='outline' className='text-xs'>
                      {moduleSelectedCount}/{permissions.length}
                    </Badge>
                  </div>
                  <div className='flex gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={e => {
                        e.stopPropagation();
                        handleSelectAllModule(module);
                      }}
                      className='text-xs rounded-full'
                      disabled={!canAssignPermissions}
                    >
                      <CheckCircle className='h-3 w-3 mr-1' />
                      Todos
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={e => {
                        e.stopPropagation();
                        handleDeselectAllModule(module);
                      }}
                      className='text-xs rounded-full'
                      disabled={!canAssignPermissions}
                    >
                      <XCircle className='h-3 w-3 mr-1' />
                      Ninguno
                    </Button>
                  </div>
                </div>

                {/* Lista de permisos (colapsable) */}
                {isExpanded && (
                  <div className='p-3 space-y-2 bg-white dark:bg-neutral-900'>
                    {permissions.map(permission => (
                      <div
                        key={permission.id || `permission-${Math.random()}`}
                        className='flex items-center justify-between p-3 bg-zinc-50 dark:bg-neutral-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-neutral-700 transition-colors'
                      >
                        <div className='flex-1'>
                          <div className='flex items-center gap-2'>
                            <input
                              type='checkbox'
                              checked={selectedPermissions.includes(permission.id.toString())}
                              onChange={() => handlePermissionToggle(permission.id.toString())}
                              className='rounded border-zinc-300 dark:border-neutral-600 text-black focus:ring-black'
                              disabled={!canAssignPermissions}
                            />
                            <span className='text-sm font-medium text-zinc-800 dark:text-neutral-100'>
                              {permission.name}
                            </span>
                            {selectedPermissions.includes(permission.id.toString()) && (
                              <Badge variant='secondary' className='text-xs'>
                                Asignado
                              </Badge>
                            )}
                          </div>
                          <p className='text-xs text-zinc-600 dark:text-neutral-400 ml-6 mt-1'>
                            {permission.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Footer fijo */}
      <div className='flex-shrink-0 bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-800 p-4'>
        <div className='flex items-center justify-between text-sm'>
          <span className='text-zinc-600 dark:text-neutral-400'>Permisos seleccionados:</span>
          <Badge variant='outline'>
            {selectedPermissions.length} de {Object.values(permissionsByModule).flat().length}
          </Badge>
        </div>
      </div>
    </div>
  );
}
