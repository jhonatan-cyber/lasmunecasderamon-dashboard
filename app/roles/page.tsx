/* eslint-disable */
'use client';
import { toast } from 'sonner';
import { useState, useEffect, useCallback } from 'react';
import logger from '@/lib/utils/logger';

import {
  Search,
  Plus,
  Edit,
  Trash2,
  Shield,
  Users as UsersIcon,
  Key,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';

import { StatsCard } from '@/components/roles/RoleStatsCard';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { RoleCard } from '@/components/roles/RoleCard';
import { PermissionsPanel } from '@/components/roles/PermissionsPanel';
import { useRoles, Role } from '@/hooks/personal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RoleForm } from '@/components/roles/RoleForm';
import { DeleteRoleConfirmModal } from '@/components/roles/DeleteRoleConfirmModal';
import { FilterSelect } from '@/components/shared/selects';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toastUtils';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

// Las interfaces Role y Permission se importan desde los hooks

const ROLE_STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: '1', label: 'Activo' },
  { value: '0', label: 'Inactivo' }
];

export default function RolesPage() {
  const {
    roles,
    isLoading,
    error,
    fetchRoles,
    createRole,
    updateRole,
    deactivateRole,
    activateRole,
    deleteRole
  } = useRoles();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<number | 'all'>('all');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editRoleId, setEditRoleId] = useState<number | null>(null);
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [roleToAction, setRoleToAction] = useState<Role | null>(null);
  const [modalAction, setModalAction] = useState<'delete' | 'deactivate'>('delete');
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);

  // Cargar los roles al montar el componente
  useEffect(() => {
    fetchRoles();
  }, []); // Removed fetchRoles from dependencies

  const setupRolesTable = async () => {
    try {
      const response = await fetch('/api/roles/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();

      if (result.success) {
        showSuccessToast('Tabla de roles configurada correctamente');
        await fetchRoles();
      } else {
        showErrorToast(result.message || 'Error al configurar roles');
      }
    } catch (_error) {
      showErrorToast('Error al configurar la tabla de roles');
    }
  };

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await createRole(newRole);
      setIsAddRoleModalOpen(false);
      setNewRole({ name: '', description: '' });
      showSuccessToast('Rol creado correctamente');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al crear el rol';
      showErrorToast(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditRole = (role: Role) => {
    setIsEditMode(true);
    setEditRoleId(role.id);
    setNewRole({ name: role.name, description: role.description });
    setIsAddRoleModalOpen(true);
  };

  const handleSubmitRole = async (data: { name: string; description: string }) => {
    if (isSubmitting) return;

    logger.info('ðŸ”µ [ROLES PAGE] handleSubmitRole llamado con datos:', data);

    try {
      setIsSubmitting(true);
      if (isEditMode && editRoleId) {
        await updateRole(editRoleId, data.name, data.description);
        showSuccessToast('Rol actualizado correctamente');
      } else {
        await createRole(data);
        showSuccessToast('Rol creado correctamente');
      }
      setIsAddRoleModalOpen(false);
      setIsEditMode(false);
      setEditRoleId(null);
      setNewRole({ name: '', description: '' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar el rol';
      showErrorToast(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calcular estadísticas
  const totalRoles = roles.length;
  const activeRoles = roles.filter(role => role.status === 1).length;
  const totalUsersAssigned = roles.reduce((total, role) => total + (role.userCount || 0), 0);

  // Filtrar roles
  const filteredRoles = roles.filter(role => {
    const matchesSearch =
      (role.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (role.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || role.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleActivateRole = async (roleId: number) => {
    try {
      await activateRole(roleId);
      showSuccessToast('Rol activado correctamente');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al activar el rol';
      showErrorToast(errorMessage);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    setRoleToAction(role);
    setModalAction('delete');
    setIsConfirmModalOpen(true);
  };

  const handleDeactivateRole = async (role: Role) => {
    setRoleToAction(role);
    setModalAction('deactivate');
    setIsConfirmModalOpen(true);
  };

  const confirmAction = async () => {
    if (!roleToAction) return;

    try {
      if (modalAction === 'delete') {
        await deleteRole(roleToAction.id);
        showSuccessToast('Rol eliminado correctamente');
      } else {
        await deactivateRole(roleToAction.id);
        showSuccessToast('Rol desactivado correctamente');
      }
      setRoleToAction(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : `Error al ${modalAction === 'delete' ? 'eliminar' : 'desactivar'} el rol`;
      showErrorToast(errorMessage);
    }
  };

  return (
    <PermissionGuard module='roles' action='view'>
      <TooltipProvider>
        <>
          {/* Modal */}
          <Dialog
            open={isAddRoleModalOpen}
            onOpenChange={open => {
              setIsAddRoleModalOpen(open);
              if (!open) {
                setIsEditMode(false);
                setEditRoleId(null);
                setNewRole({ name: '', description: '' });
              }
            }}
          >
            <DialogContent className='w-[95vw] max-w-[95vw] sm:w-auto sm:max-w-[500px] max-h-[90vh] flex flex-col p-0'>
              <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b'>
                <DialogTitle className='text-lg sm:text-xl lg:text-2xl'>
                  {isEditMode ? 'Editar Rol' : 'Agregar Nuevo Rol'}
                </DialogTitle>
                <DialogDescription className='sr-only'>Formulario de rol</DialogDescription>
              </DialogHeader>
              <div className='flex-1 overflow-y-auto px-6 py-4'>
                <RoleForm
                  isEditMode={isEditMode}
                  initialValues={newRole}
                  open={isAddRoleModalOpen}
                  isLoading={isSubmitting}
                  onSubmit={handleSubmitRole}
                  onCancel={() => {
                    setIsAddRoleModalOpen(false);
                    setIsEditMode(false);
                    setEditRoleId(null);
                    setNewRole({ name: '', description: '' });
                  }}
                  hideButtons={true}
                />
              </div>
              <div className='flex-shrink-0 border-t px-6 py-4'>
                <div className='flex flex-col sm:flex-row justify-center gap-2 w-full'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='rounded-full px-6 hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white w-full sm:w-auto'
                    onClick={() => {
                      setIsAddRoleModalOpen(false);
                      setIsEditMode(false);
                      setEditRoleId(null);
                      setNewRole({ name: '', description: '' });
                    }}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type='submit'
                    form='role-form'
                    variant='outline'
                    size='sm'
                    className='bg-black text-white rounded-full px-6 hover:scale-105 transition-all duration-200 w-full sm:w-auto'
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Guardando...' : isEditMode ? 'Guardar Cambios' : 'Guardar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Confirmation Modal */}
          <DeleteRoleConfirmModal
            open={isConfirmModalOpen}
            onOpenChange={setIsConfirmModalOpen}
            onConfirm={confirmAction}
            roleName={roleToAction?.name || ''}
            action={modalAction}
          />
          <Dialog open={isPermissionsModalOpen} onOpenChange={setIsPermissionsModalOpen}>
            <DialogContent className='w-[95vw] max-w-[95vw] sm:hidden h-[90vh] flex flex-col p-0 overflow-hidden'>
              <DialogHeader className='flex-shrink-0 px-4 pt-4 pb-3 border-b'>
                <DialogTitle className='text-base font-semibold'>
                  {selectedRole ? `Permisos del Rol: ${selectedRole.name}` : 'Permisos del Rol'}
                </DialogTitle>
                <DialogDescription className='sr-only'>
                  Gestión de permisos del rol seleccionado
                </DialogDescription>
              </DialogHeader>
              <div className='flex-1 min-h-0 overflow-hidden p-2'>
                <div className='h-full min-h-0 overflow-hidden bg-white dark:bg-neutral-900 rounded-lg'>
                  <PermissionsPanel selectedRole={selectedRole} />
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <div className='w-full max-w-none flex flex-col gap-4 sm:gap-6 px-1 sm:p-6 lg:p-10 mt-3 sm:mt-6 lg:mt-10'>
            {/* Header */}
            <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6'>
              <div>
                <h2 className='text-3xl font-bold text-black dark:text-neutral-100'>
                  Gestión de Roles
                </h2>
                <p className='text-gray-600 dark:text-neutral-300 mt-1'>
                  Administra roles y permisos del sistema
                </p>
              </div>
              <PermissionGuard module='roles' action='create' fallback={null}>
                <button
                  className='whitespace-nowrap inline-flex items-center justify-center px-6 py-2 bg-black text-white rounded-full hover:bg-white/90 hover:text-black dark:hover:bg-white dark:hover:text-black hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto'
                  onClick={() => {
                    setIsAddRoleModalOpen(true);
                    setIsEditMode(false);
                    setEditRoleId(null);
                    setNewRole({ name: '', description: '' });
                  }}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className='flex items-center justify-center w-full'>
                        <Plus className='h-4 w-4 mr-2' />
                        Nuevo Rol
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Crear nuevo rol</TooltipContent>
                  </Tooltip>
                </button>
              </PermissionGuard>
            </div>

            {/* Stats Cards */}
            <div className='grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 [&>*:last-child:nth-child(odd)]:col-span-2 lg:[&>*:last-child:nth-child(odd)]:col-span-1'>
              <StatsCard
                icon={<Shield className='h-5 w-5 sm:h-6 sm:w-6 text-white' />}
                bgColor='bg-black'
                title='Total Roles'
                value={totalRoles}
              />
              <StatsCard
                icon={<CheckCircle className='h-5 w-5 sm:h-6 sm:w-6 text-white' />}
                bgColor='bg-green-600'
                title='Roles Activos'
                value={activeRoles}
              />
              <StatsCard
                icon={<UsersIcon className='h-5 w-5 sm:h-6 sm:w-6 text-white' />}
                bgColor='bg-zinc-700'
                title='Usuarios Asignados'
                value={totalUsersAssigned}
              />
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6'>
              {/* Columna izquierda - Filtros y Roles (50%) */}
              <div className='space-y-4'>
                {/* Filters */}
                <div className='bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800 p-4 sm:p-6'>
                  <div className='flex flex-col sm:flex-row gap-4'>
                    <div className='flex-1'>
                      <div className='relative'>
                        <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-neutral-500' />
                        <input
                          type='text'
                          placeholder='Buscar roles...'
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className='w-full pl-10 pr-4 py-2 border border-zinc-300 dark:border-neutral-700 rounded-full focus:ring-2 focus:ring-black focus:border-transparent text-sm sm:text-base bg-white dark:bg-neutral-800 text-black dark:text-neutral-100 placeholder:text-zinc-400 dark:placeholder:text-neutral-500'
                        />
                      </div>
                    </div>
                    <div className='flex items-center gap-2 w-full'>
                      <div className='w-full min-w-0'>
                        <FilterSelect
                          label='Estado'
                          value={String(filterStatus)}
                          onChange={value =>
                            setFilterStatus(value === 'all' ? 'all' : Number(value))
                          }
                          options={ROLE_STATUS_OPTIONS}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Roles List */}
                <div className='space-y-4 overflow-y-auto max-h-[500px] pr-3 pl-3 pt-3'>
                  {filteredRoles.length === 0 ? (
                    <div className='text-center py-8'>
                      <Shield className='h-8 w-8 sm:h-12 sm:w-12 text-zinc-400 mx-auto mb-4' />
                      <h3 className='text-base sm:text-lg font-medium text-zinc-600 dark:text-neutral-300 mb-2'>
                        No se encontraron roles
                      </h3>
                      <p className='text-xs sm:text-sm text-zinc-500 dark:text-neutral-400 mb-4'>
                        {searchTerm || filterStatus !== 'all'
                          ? 'Intenta ajustar los filtros de búsqueda'
                          : 'No hay roles registrados en el sistema'}
                      </p>
                      {!searchTerm && filterStatus === 'all' && (
                        <button
                          onClick={setupRolesTable}
                          className='inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors text-sm'
                        >
                          <Shield className='h-4 w-4 mr-2' />
                          Configurar Roles del Sistema
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredRoles.map(role => (
                      <RoleCard
                        key={role.id || `role-${Math.random()}`}
                        role={role}
                        selected={selectedRole?.id === role.id}
                        onSelect={() => {
                          setSelectedRole(role);
                        }}
                        onViewPermissions={() => {
                          setSelectedRole(role);
                          setIsPermissionsModalOpen(true);
                        }}
                        onEdit={() => handleEditRole(role)}
                        onDeactivate={() => handleDeactivateRole(role)}
                        onActivate={() => handleActivateRole(role.id)}
                        onDelete={() => handleDeleteRole(role)}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Columna derecha - Permissions Panel (50%) */}
              <div className='hidden lg:block'>
                <div className='bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800 p-4 sm:p-6 flex flex-col h-[600px]'>
                  <PermissionsPanel selectedRole={selectedRole} />
                </div>
              </div>
            </div>
          </div>
        </>
      </TooltipProvider>
    </PermissionGuard>
  );
}



