import React from 'react';
import {
  Shield,
  Edit,
  Trash2,
  CheckCircle,
  Users as UsersIcon,
  Power,
  KeyRound,
  MoreVertical
} from 'lucide-react';
import { ActionButtonWithTooltip } from '@/components/roles/ActionButtonWithTooltip';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export function RoleCard({
  role,
  selected,
  onSelect,
  onViewPermissions,
  onEdit,
  onDeactivate,
  onActivate,
  onDelete
}: {
  role: any;
  selected: boolean;
  onSelect: () => void;
  onViewPermissions: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onActivate: () => void;
  onDelete: () => void;
}) {
  const { hasPermission } = useUserPermissions();

  const canEdit = hasPermission('roles', 'editar');
  const canActivate = hasPermission('roles', 'activar');
  const canDeactivate = hasPermission('roles', 'desactivar');
  const canDelete = hasPermission('roles', 'eliminar');

  return (
    <div
      className={`w-full bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800 p-3 sm:p-6 hover:shadow-md transition-all duration-200 cursor-pointer ${
        selected ? 'ring-2 ring-black dark:ring-neutral-200' : ''
      }`}
      onClick={onSelect}
    >
      <div className='flex items-start justify-between gap-2 mb-3 sm:mb-4'>
        <div className='flex items-start min-w-0'>
          <div className={`${role.color} rounded-lg p-2 sm:p-3 mr-2 sm:mr-3 shrink-0`}>
            <Shield className='h-4 w-4 sm:h-6 sm:w-6 text-white' />
          </div>
          <div className='min-w-0'>
            <h3 className='text-sm sm:text-lg font-semibold text-black dark:text-neutral-100 break-words'>
              {role.name || 'Sin nombre'}
            </h3>
            <p className='text-xs sm:text-sm text-zinc-600 dark:text-neutral-400 break-words'>
              {role.description || 'Sin descripción'}
            </p>
          </div>
        </div>

        <div className='shrink-0' onClick={e => e.stopPropagation()}>
          <div className='lg:hidden'>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type='button'
                  className='inline-flex items-center justify-center p-2 rounded-full border border-zinc-200 dark:border-zinc-700'
                  aria-label='Acciones'
                >
                  <MoreVertical className='h-4 w-4' />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-44'>
                <DropdownMenuItem onClick={onViewPermissions}>
                  <KeyRound className='h-4 w-4 mr-2 text-green-600' />
                  Permisos
                </DropdownMenuItem>
                {role.status === 1 && canEdit && (
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className='h-4 w-4 mr-2 text-blue-600' />
                    Editar
                  </DropdownMenuItem>
                )}
                {role.status === 0 && canActivate ? (
                  <DropdownMenuItem onClick={onActivate}>
                    <CheckCircle className='h-4 w-4 mr-2 text-green-600' />
                    Activar
                  </DropdownMenuItem>
                ) : role.status === 1 && canDeactivate ? (
                  <DropdownMenuItem onClick={onDeactivate}>
                    <Power className='h-4 w-4 mr-2 text-orange-600' />
                    Desactivar
                  </DropdownMenuItem>
                ) : null}
                {canDelete && (
                  <DropdownMenuItem onClick={onDelete}>
                    <Trash2 className='h-4 w-4 mr-2 text-red-600' />
                    Eliminar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className='hidden lg:flex space-x-1'>
            {role.status === 1 && canEdit && (
              <ActionButtonWithTooltip
                onClick={onEdit}
                tooltip='Editar rol'
                className='text-blue-600 hover:text-blue-800 p-2 rounded'
              >
                <Edit className='h-4 w-4' />
              </ActionButtonWithTooltip>
            )}

            {role.status === 0 && canActivate ? (
              <ActionButtonWithTooltip
                onClick={onActivate}
                tooltip='Activar rol'
                className='text-green-600 hover:text-green-800 p-2 rounded'
              >
                <CheckCircle className='h-4 w-4' />
              </ActionButtonWithTooltip>
            ) : role.status === 1 && canDeactivate ? (
              <ActionButtonWithTooltip
                onClick={onDeactivate}
                tooltip='Desactivar rol'
                className='text-orange-600 hover:text-orange-800 p-2 rounded'
              >
                <Power className='h-4 w-4' />
              </ActionButtonWithTooltip>
            ) : null}

            {canDelete && (
              <ActionButtonWithTooltip
                onClick={onDelete}
                tooltip='Eliminar rol'
                className='text-red-600 hover:text-red-800 p-2 rounded'
              >
                <Trash2 className='h-4 w-4' />
              </ActionButtonWithTooltip>
            )}
          </div>
        </div>
      </div>

      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center text-xs sm:text-sm text-zinc-500 dark:text-neutral-400 min-w-0'>
          <UsersIcon className='h-3 w-3 sm:h-4 sm:w-4 mr-1 shrink-0' />
          {role.userCount} usuarios
        </div>
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
            role.status === 1
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
          }`}
        >
          {role.status === 1 ? 'Activo' : 'Inactivo'}
        </span>
      </div>
    </div>
  );
}
