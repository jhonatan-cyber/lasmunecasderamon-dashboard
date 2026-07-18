'use client';

import { Search, Shield, Plus, CheckCircle, Users as UsersIcon } from 'lucide-react';
import { StatsCard } from '@/components/roles/RoleStatsCard';
import { RoleCard } from '@/components/roles/RoleCard';
import { PermissionsPanel } from '@/components/roles/PermissionsPanel';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { FilterSelect } from '@/components/shared/selects';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { Role } from '@/hooks/personal';

const ROLE_STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: '1', label: 'Activo' },
  { value: '0', label: 'Inactivo' }
];

interface RolesContentProps {
  roles: Role[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: number | 'all';
  setFilterStatus: (status: number | 'all') => void;
  selectedRole: Role | null;
  setSelectedRole: (role: Role | null) => void;
  onViewPermissions: (role: Role) => void;
  onEdit: (role: Role) => void;
  onDeactivate: (role: Role) => void;
  onActivate: (roleId: number) => void;
  onDelete: (role: Role) => void;
  onSetupRoles: () => void;
  onNewRole: () => void;
}

export function RolesContent({
  roles,
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  selectedRole,
  setSelectedRole,
  onViewPermissions,
  onEdit,
  onDeactivate,
  onActivate,
  onDelete,
  onSetupRoles,
  onNewRole
}: RolesContentProps) {
  const totalRoles = roles.length;
  const activeRoles = roles.filter(r => r.status === 1).length;
  const totalUsersAssigned = roles.reduce((total, r) => total + (r.userCount || 0), 0);

  const filteredRoles = roles.filter(role => {
    const matchesSearch =
      (role.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (role.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || role.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className='w-full max-w-none flex flex-col gap-4 sm:gap-6 px-1 sm:p-6 lg:p-10 mt-3 sm:mt-6 lg:mt-10'>
      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6'>
        <div>
          <h2 className='text-3xl font-bold text-black dark:text-neutral-100'>Gestión de Roles</h2>
          <p className='text-gray-600 dark:text-neutral-300 mt-1'>
            Administra roles y permisos del sistema
          </p>
        </div>
        <PermissionGuard module='roles' action='create' fallback={null}>
          <button
            className='whitespace-nowrap inline-flex items-center justify-center px-6 py-2 bg-black text-white rounded-full hover:bg-white/90 hover:text-black dark:hover:bg-white dark:hover:text-black hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto'
            onClick={onNewRole}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <span className='flex items-center justify-center w-full'>
                  <Plus className='h-4 w-4 mr-2' />
                  Nuevo Rol
                </span>
              </TooltipTrigger>
            </Tooltip>
          </button>
        </PermissionGuard>
      </div>

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
        <div className='space-y-4'>
          <div className='bg-white dark:bg-neutral-900 rounded-lg shadow-xs border border-gray-200 dark:border-neutral-800 p-4 sm:p-6'>
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
                    onChange={value => setFilterStatus(value === 'all' ? 'all' : Number(value))}
                    options={ROLE_STATUS_OPTIONS}
                  />
                </div>
              </div>
            </div>
          </div>

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
                    onClick={onSetupRoles}
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
                  key={role.id}
                  role={role}
                  selected={selectedRole?.id === role.id}
                  onSelect={() => setSelectedRole(role)}
                  onViewPermissions={() => onViewPermissions(role)}
                  onEdit={() => onEdit(role)}
                  onDeactivate={() => onDeactivate(role)}
                  onActivate={() => onActivate(role.id)}
                  onDelete={() => onDelete(role)}
                />
              ))
            )}
          </div>
        </div>

        <div className='hidden lg:block'>
          <div className='bg-white dark:bg-neutral-900 rounded-lg shadow-xs border border-gray-200 dark:border-neutral-800 p-4 sm:p-6 flex flex-col h-[600px]'>
            <PermissionsPanel selectedRole={selectedRole} />
          </div>
        </div>
      </div>
    </div>
  );
}
