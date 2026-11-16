'use client';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

import { Shield, Plus, CheckCircle, Users as UsersIcon } from 'lucide-react';
import { MetricCard } from '@/components/shared/MetricCard';
import { RoleCard } from '@/components/roles/RoleCard';
import { PermissionsPanel } from '@/components/roles/PermissionsPanel';
import { RoleUsersList } from '@/components/roles/RoleUsersList';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { FilterSelect } from '@/components/shared/selects';
import SearchInput from '@/components/shared/SearchInput';
import type { Role } from '@/hooks/staff';

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
    <div className='w-full max-w-none flex flex-col p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 mb-6'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight text-slate-900 dark:text-white'>
            Gestión de Roles
          </h1>
          <p className='text-gray-600 dark:text-neutral-300 mt-1'>
            Administra roles y permisos del sistema
          </p>
        </div>
        <PermissionGuard module='roles' action='create' fallback={null}>
          <Button
            size='sm'
            className='w-full sm:w-auto justify-center rounded-full px-4 sm:px-6 py-2 bg-black text-white hover:bg-white hover:text-black hover:scale-105 transition-all duration-200 text-sm sm:text-base border-2 dark:bg-black dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black dark:hover:border-white'
            onClick={onNewRole}
          >
            <Plus className='w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2' />
            Nuevo Rol
          </Button>
        </PermissionGuard>
      </div>

      <div className='grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 [&>*:last-child:nth-child(odd)]:col-span-2 lg:[&>*:last-child:nth-child(odd)]:col-span-1'>
        <MetricCard
          icon={<Shield className='h-5 w-5 sm:h-6 sm:w-6 text-white' />}
          badge='Roles'
          tone='slate'
          label='Total Roles'
          value={totalRoles}
        />
        <MetricCard
          icon={<CheckCircle className='h-5 w-5 sm:h-6 sm:w-6 text-white' />}
          badge='Roles'
          tone='emerald'
          label='Roles Activos'
          value={activeRoles}
        />
        <MetricCard
          icon={<UsersIcon className='h-5 w-5 sm:h-6 sm:w-6 text-white' />}
          badge='Roles'
          tone='blue'
          label='Usuarios Asignados'
          value={totalUsersAssigned}
        />
      </div>

      <Card className='shadow-md border-none bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl overflow-hidden'>
        <CardContent className='p-4 sm:p-6'>
          <div className='flex flex-col sm:flex-row gap-4'>
            <div className='flex-1'>
              <Label className='mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'>
                Buscar
              </Label>
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder='Buscar roles...'
                className='w-full rounded-full bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100'
              />
            </div>
            <div className='w-full sm:w-auto sm:min-w-[160px]'>
              <FilterSelect
                label='Estado'
                value={String(filterStatus)}
                onChange={value => setFilterStatus(value === 'all' ? 'all' : Number(value))}
                options={ROLE_STATUS_OPTIONS}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6'>
        <div className='space-y-4'>
          <div className='space-y-4'>
            {filteredRoles.length === 0 ? (
              <EmptyState
                icon={Shield}
                title='No se encontraron roles'
                description={
                  searchTerm || filterStatus !== 'all'
                    ? 'Intenta ajustar los filtros de búsqueda'
                    : 'No hay roles registrados en el sistema'
                }
                action={
                  !searchTerm &&
                  filterStatus === 'all' && (
                    <Button
                      variant='unstyled'
                      onClick={onSetupRoles}
                      className='inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors text-sm'
                    >
                      <Shield className='h-4 w-4 mr-2' />
                      Configurar Roles del Sistema
                    </Button>
                  )
                }
              />
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
          <div className='flex flex-col gap-4 sm:gap-6'>
            <RoleUsersList role={selectedRole} />
            <div className='bg-white dark:bg-neutral-900 rounded-3xl shadow-md border-none flex flex-col h-[600px]'>
              <PermissionsPanel selectedRole={selectedRole} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
