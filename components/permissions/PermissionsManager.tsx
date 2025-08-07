import { useState } from 'react';
import { Plus, Shield, Edit, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { usePermissions } from '@/hooks/usePermissions';
import { showSuccessToast, showErrorToast } from '@/lib/toastUtils';

export function PermissionsManager() {
  const { permissions, permissionsByModule, createPermission, fetchPermissions } = usePermissions();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPermission, setNewPermission] = useState({
    name: '',
    description: '',
    module: '',
    action: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreatePermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await createPermission(newPermission);
      showSuccessToast('Permiso creado correctamente');
      setIsCreateModalOpen(false);
      setNewPermission({ name: '', description: '', module: '', action: '' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al crear el permiso';
      showErrorToast(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const modules = [
    'users', 'roles', 'sales', 'products', 'categories', 
    'rooms', 'cash_register', 'orders', 'services', 'tips', 
    'settings', 'reports'
  ];

  const actions = [
    'view', 'create', 'edit', 'delete', 'activate', 'deactivate',
    'permissions', 'reports', 'export', 'open', 'close', 'process',
    'distribute'
  ];

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-zinc-900'>Gestión de Permisos</h2>
          <p className='text-zinc-600'>Administra los permisos del sistema</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className='bg-black text-white hover:bg-zinc-900'>
              <Plus className='h-4 w-4 mr-2' />
              Nuevo Permiso
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Permiso</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreatePermission} className='space-y-4'>
              <div>
                <Label htmlFor='name'>Nombre del Permiso</Label>
                <Input
                  id='name'
                  value={newPermission.name}
                  onChange={(e) => setNewPermission(prev => ({ ...prev, name: e.target.value }))}
                  placeholder='users.view'
                  required
                />
              </div>
              <div>
                <Label htmlFor='description'>Descripción</Label>
                <Input
                  id='description'
                  value={newPermission.description}
                  onChange={(e) => setNewPermission(prev => ({ ...prev, description: e.target.value }))}
                  placeholder='Ver usuarios'
                  required
                />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label htmlFor='module'>Módulo</Label>
                  <select
                    id='module'
                    value={newPermission.module}
                    onChange={(e) => setNewPermission(prev => ({ ...prev, module: e.target.value }))}
                    className='w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent'
                    required
                  >
                    <option value=''>Seleccionar módulo</option>
                    {modules.map(module => (
                      <option key={module} value={module}>{module}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor='action'>Acción</Label>
                  <select
                    id='action'
                    value={newPermission.action}
                    onChange={(e) => setNewPermission(prev => ({ ...prev, action: e.target.value }))}
                    className='w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent'
                    required
                  >
                    <option value=''>Seleccionar acción</option>
                    {actions.map(action => (
                      <option key={action} value={action}>{action}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className='flex justify-end gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  <X className='h-4 w-4 mr-2' />
                  Cancelar
                </Button>
                <Button
                  type='submit'
                  disabled={isSubmitting}
                  className='bg-black text-white hover:bg-zinc-900'
                >
                  {isSubmitting ? (
                    <div className='h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full mr-2' />
                  ) : (
                    <Save className='h-4 w-4 mr-2' />
                  )}
                  Crear Permiso
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estadísticas */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <div className='bg-white p-4 rounded-lg border border-zinc-200'>
          <div className='flex items-center'>
            <Shield className='h-8 w-8 text-zinc-600 mr-3' />
            <div>
              <p className='text-sm text-zinc-600'>Total Permisos</p>
              <p className='text-2xl font-bold text-zinc-900'>{permissions.length}</p>
            </div>
          </div>
        </div>
        <div className='bg-white p-4 rounded-lg border border-zinc-200'>
          <div className='flex items-center'>
            <div className='h-8 w-8 bg-zinc-100 rounded-lg flex items-center justify-center mr-3'>
              <span className='text-sm font-bold text-zinc-600'>M</span>
            </div>
            <div>
              <p className='text-sm text-zinc-600'>Módulos</p>
              <p className='text-2xl font-bold text-zinc-900'>{Object.keys(permissionsByModule).length}</p>
            </div>
          </div>
        </div>
        <div className='bg-white p-4 rounded-lg border border-zinc-200'>
          <div className='flex items-center'>
            <div className='h-8 w-8 bg-zinc-100 rounded-lg flex items-center justify-center mr-3'>
              <span className='text-sm font-bold text-zinc-600'>A</span>
            </div>
            <div>
              <p className='text-sm text-zinc-600'>Acciones</p>
              <p className='text-2xl font-bold text-zinc-900'>{actions.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de permisos por módulo */}
      <div className='space-y-6'>
        {Object.entries(permissionsByModule).map(([module, modulePermissions]) => (
          <div key={module} className='bg-white rounded-lg border border-zinc-200 overflow-hidden'>
            <div className='bg-zinc-50 px-4 py-3 border-b border-zinc-200'>
              <h3 className='font-semibold text-zinc-900 capitalize'>
                {module.replace('_', ' ')} ({modulePermissions.length})
              </h3>
            </div>
            <div className='divide-y divide-zinc-200'>
              {modulePermissions.map(permission => (
                <div key={permission.id} className='px-4 py-3 flex items-center justify-between'>
                  <div className='flex-1'>
                    <div className='flex items-center gap-2'>
                      <span className='font-medium text-zinc-900'>{permission.action}</span>
                      <Badge variant='outline' className='text-xs'>
                        {permission.module}
                      </Badge>
                    </div>
                    <p className='text-sm text-zinc-600 mt-1'>{permission.description}</p>
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs text-zinc-500'>
                      {new Date(permission.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 