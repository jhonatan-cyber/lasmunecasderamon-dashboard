'use client';
import { toast } from 'react-toastify';
import { useState, useEffect, useCallback } from 'react';
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
import Swal from 'sweetalert2';

import { StatsCard } from '@/components/ui/stats-card';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { RoleCard } from '@/components/roles/RoleCard';
import { PermissionsPanel } from '@/components/roles/PermissionsPanel';
import { useRoles, Role } from '@/hooks/useRoles';
import { RoleModal } from '@/components/roles/RoleModal';
import { showSuccessToast, showErrorToast } from '@/lib/toastUtils';

// Las interfaces Role y Permission se importan desde los hooks

export default function RolesPage() {
  const {
    roles,
    isLoading,
    error,
    fetchRoles,
    createRole,
    updateRole,
    deactivateRole,
    activateRole
  } = useRoles();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<number | 'all'>('all');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editRoleId, setEditRoleId] = useState<number | null>(null);
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar los roles al montar el componente
  useEffect(() => {
    fetchRoles();
  }, []); // Removed fetchRoles from dependencies

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

  const handleSubmitRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      if (isEditMode && editRoleId) {
        await updateRole(editRoleId, newRole.name, newRole.description);
        showSuccessToast('Rol actualizado correctamente');
      } else {
        await createRole(newRole);
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

  const getStatusColor = (status: number) => {
    return status === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getStatusText = (status: number) => {
    return status === 1 ? 'Activo' : 'Inactivo';
  };

  const handleDeactivateRole = async (roleId: number) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: '¿Deseas desactivar este rol?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
      customClass: {
        confirmButton: 'swal2-confirm-sm-outline',
        cancelButton: 'swal2-cancel-sm-outline'
      }
    });

    if (!result.isConfirmed) return;

    try {
      await deactivateRole(roleId);
      showSuccessToast('Rol desactivado correctamente');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al desactivar el rol';
      showErrorToast(errorMessage);
    }
  };

  const handleActivateRole = async (roleId: number) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: '¿Deseas activar este rol?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, activar',
      cancelButtonText: 'Cancelar',
      customClass: {
        confirmButton: 'swal2-confirm-sm-outline',
        cancelButton: 'swal2-cancel-sm-outline'
      }
    });

    if (!result.isConfirmed) return;

    try {
      await activateRole(roleId);
      showSuccessToast('Rol activado correctamente');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al activar el rol';
      showErrorToast(errorMessage);
    }
  };

  return (
    <TooltipProvider>
      <>
        {/* Modal */}
        <RoleModal
          open={isAddRoleModalOpen}
          onOpenChange={open => {
            setIsAddRoleModalOpen(open);
            if (!open) {
              setIsEditMode(false);
              setEditRoleId(null);
              setNewRole({ name: '', description: '' });
            }
          }}
          isEditMode={isEditMode}
          newRole={newRole}
          setNewRole={setNewRole}
          isLoading={isSubmitting}
          onSubmit={handleSubmitRole}
          onCancel={() => {
            setIsAddRoleModalOpen(false);
            setIsEditMode(false);
            setEditRoleId(null);
            setNewRole({ name: '', description: '' });
          }}
        />
        <div className='container mx-auto px-4 sm:px-6 py-4 sm:py-6 mt-4 sm:mt-6 lg:mt-10 space-y-4 sm:space-y-6'>
          {/* Header */}
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
            <div>
              <h2 className='text-xl sm:text-2xl lg:text-3xl font-bold text-black'>
                Gestión de Roles
              </h2>
              <p className='text-sm sm:text-base text-zinc-600 mt-1'>
                Administra roles y permisos del sistema
              </p>
            </div>
            <button
              className='whitespace-nowrap inline-flex items-center px-4 py-2 bg-black text-white rounded-xl hover:bg-zinc-900 transition-colors hover:scale-110 duration-200 text-sm sm:text-base w-full sm:w-auto'
              onClick={() => {
                setIsAddRoleModalOpen(true);
                setIsEditMode(false);
                setEditRoleId(null);
                setNewRole({ name: '', description: '' });
              }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className='flex items-center'>
                    <Plus className='h-4 w-4 mr-2' />
                    Nuevo
                  </span>
                </TooltipTrigger>
                <TooltipContent>Crear nuevo rol</TooltipContent>
              </Tooltip>
            </button>
          </div>

          {/* Stats Cards */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6'>
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

          {/* Filters */}
          <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6'>
            <div className='flex flex-col sm:flex-row gap-4'>
              <div className='flex-1'>
                <div className='relative'>
                  <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400' />
                  <input
                    type='text'
                    placeholder='Buscar roles...'
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className='w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-sm sm:text-base'
                  />
                </div>
              </div>
              <div className='flex items-center gap-2'>
                <select
                  value={filterStatus}
                  onChange={e =>
                    setFilterStatus(e.target.value === 'all' ? 'all' : Number(e.target.value))
                  }
                  className='px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-sm sm:text-base'
                >
                  <option value='all'>Todos</option>
                  <option value={1}>Activo</option>
                  <option value={0}>Inactivo</option>
                </select>
              </div>
            </div>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6'>
            {/* Roles List */}
            <div className='space-y-4 overflow-y-auto max-h-96 pr-3 pl-3 pt-3'>
              {filteredRoles.length === 0 ? (
                <div className='text-center py-8'>
                  <Shield className='h-8 w-8 sm:h-12 sm:w-12 text-zinc-400 mx-auto mb-4' />
                  <h3 className='text-base sm:text-lg font-medium text-zinc-600 mb-2'>
                    No se encontraron roles
                  </h3>
                  <p className='text-xs sm:text-sm text-zinc-500'>
                    {searchTerm || filterStatus !== 'all'
                      ? 'Intenta ajustar los filtros de búsqueda'
                      : 'No hay roles registrados en el sistema'}
                  </p>
                </div>
              ) : (
                filteredRoles.map(role => (
                  <RoleCard
                    key={role.id || `role-${Math.random()}`}
                    role={role}
                    selected={selectedRole?.id === role.id}
                    onSelect={() => setSelectedRole(role)}
                    onEdit={() => handleEditRole(role)}
                    onDeactivate={() => handleDeactivateRole(role.id)}
                    onActivate={() => handleActivateRole(role.id)}
                  />
                ))
              )}
            </div>
            {/* Permissions Panel */}
            <div
              className='bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 flex flex-col max-h-96'
              style={{ height: '384px' }}
            >
              <PermissionsPanel selectedRole={selectedRole} />
            </div>
          </div>
        </div>
      </>
    </TooltipProvider>
  );
}
