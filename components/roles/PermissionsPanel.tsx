import { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePermissions, Permission } from '@/hooks/usePermissions';
import { Role } from '@/hooks/useRoles';
import { showSuccessToast, showErrorToast } from '@/lib/toastUtils';

interface PermissionsPanelProps {
  selectedRole: Role | null;
}

export function PermissionsPanel({ selectedRole }: PermissionsPanelProps) {
  const { permissionsByModule, getRolePermissions, updateRolePermissions } = usePermissions();
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Cargar permisos del rol cuando se selecciona uno
  useEffect(() => {
    if (selectedRole) {
      loadRolePermissions(selectedRole.id);
    } else {
      setRolePermissions([]);
      setSelectedPermissions([]);
    }
  }, [selectedRole]);

  const loadRolePermissions = async (roleId: string) => {
    setIsLoading(true);
    try {
      const permissions = await getRolePermissions(roleId);
      console.log('Raw permissions from API:', permissions);
      
      setRolePermissions(permissions);
      
      // Obtener IDs de permisos asignados
      const assignedPermissionIds = permissions
        .filter(p => p.assigned === true || p.assigned === 1)
        .map(p => p.id.toString());
      setSelectedPermissions(assignedPermissionIds);
      
      console.log('Filtered assigned permissions:', permissions.filter(p => p.assigned === true || p.assigned === 1));
      console.log('Assigned permission IDs:', assignedPermissionIds);
    } catch (error) {
      console.error('Error loading role permissions:', error);
      showErrorToast('Error al cargar los permisos del rol');
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
      console.log('Saving permissions for role:', selectedRole.id, 'Permissions:', selectedPermissions);
      await updateRolePermissions(selectedRole.id, selectedPermissions);
      showSuccessToast('Permisos actualizados correctamente');
      
      // Recargar permisos del rol
      await loadRolePermissions(selectedRole.id);
    } catch (error) {
      console.error('Error saving permissions:', error);
      showErrorToast('Error al actualizar los permisos');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectAllModule = (module: string) => {
    const modulePermissions = permissionsByModule[module] || [];
    const modulePermissionIds = modulePermissions.map(p => p.id.toString());
    
    setSelectedPermissions(prev => {
      const otherModules = prev.filter(id => 
        !modulePermissionIds.includes(id)
      );
      return [...otherModules, ...modulePermissionIds];
    });
  };

  const handleDeselectAllModule = (module: string) => {
    const modulePermissions = permissionsByModule[module] || [];
    const modulePermissionIds = modulePermissions.map(p => p.id.toString());
    
    setSelectedPermissions(prev => 
      prev.filter(id => !modulePermissionIds.includes(id))
    );
  };

  if (!selectedRole) {
    return (
      <div className='flex flex-col items-center justify-center h-full text-center p-6'>
        <Shield className='h-12 w-12 text-zinc-400 mb-4' />
        <h3 className='text-lg font-medium text-zinc-600 mb-2'>
          Selecciona un rol
        </h3>
        <p className='text-sm text-zinc-500'>
          Selecciona un rol para gestionar sus permisos
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='flex flex-col items-center justify-center h-full'>
        <Loader2 className='h-8 w-8 animate-spin text-zinc-600 mb-4' />
        <p className='text-sm text-zinc-600'>Cargando permisos...</p>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-full'>
      {/* Header */}
      <div className='flex items-center justify-between mb-4 pb-4 border-b'>
        <div>
          <h3 className='text-lg font-semibold text-zinc-900'>
            Permisos del Rol
          </h3>
          <p className='text-sm text-zinc-600'>
            {selectedRole.name}
          </p>
        </div>
        <Button
          onClick={handleSavePermissions}
          disabled={isSaving}
          className='bg-black text-white hover:bg-zinc-900'
        >
          {isSaving ? (
            <Loader2 className='h-4 w-4 animate-spin mr-2' />
          ) : (
            <Save className='h-4 w-4 mr-2' />
          )}
          Guardar
        </Button>
      </div>

      {/* Permisos por módulo */}
      <div className='flex-1 overflow-y-auto space-y-6'>
        {Object.entries(permissionsByModule).map(([module, permissions]) => (
          <div key={module} className='space-y-3'>
            {/* Header del módulo */}
            <div className='flex items-center justify-between'>
              <h4 className='font-medium text-zinc-800 capitalize'>
                {module.replace('_', ' ')}
              </h4>
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => handleSelectAllModule(module)}
                  className='text-xs'
                >
                  <CheckCircle className='h-3 w-3 mr-1' />
                  Todos
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => handleDeselectAllModule(module)}
                  className='text-xs'
                >
                  <XCircle className='h-3 w-3 mr-1' />
                  Ninguno
                </Button>
              </div>
            </div>

            {/* Lista de permisos */}
            <div className='space-y-2'>
              {permissions.map(permission => (
                <div
                  key={permission.id || `permission-${Math.random()}`}
                  className='flex items-center justify-between p-3 bg-zinc-50 rounded-lg hover:bg-zinc-100 transition-colors'
                >
                  <div className='flex-1'>
                    <div className='flex items-center gap-2'>
                      <input
                        type='checkbox'
                        checked={selectedPermissions.includes(permission.id.toString())}
                                                 onChange={() => handlePermissionToggle(permission.id.toString())}
                        className='rounded border-zinc-300 text-black focus:ring-black'
                      />
                      <span className='text-sm font-medium text-zinc-800'>
                        {permission.action}
                      </span>
                                             {selectedPermissions.includes(permission.id.toString()) && (
                        <Badge variant='secondary' className='text-xs'>
                          Asignado
                        </Badge>
                      )}
                    </div>
                    <p className='text-xs text-zinc-600 ml-6 mt-1'>
                      {permission.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer con estadísticas */}
      <div className='mt-4 pt-4 border-t'>
        <div className='flex items-center justify-between text-sm'>
          <span className='text-zinc-600'>
            Permisos seleccionados:
          </span>
          <Badge variant='outline'>
            {selectedPermissions.length} de {rolePermissions.length}
          </Badge>
        </div>
      </div>
    </div>
  );
} 