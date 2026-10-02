import { memo } from 'react';
import { User as UserType } from '@/types/user';
import { Button } from '@/components/ui/button';
import {
  Eye,
  Pencil,
  Trash2,
  Power,
  Check,
  MoreVertical,
  Fingerprint,
  UserMinus
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UserActionMenuProps {
  user: UserType;
  onViewDetails: (user: UserType) => void;
  onEdit: (user: UserType) => void;
  onEnroll: (user: UserType) => void;
  onUnenroll: (user: UserType) => void;
  onActivate: (userId: string | number) => void;
  onDeactivate: (userId: string | number) => void;
  onDelete: (userId: string | number) => void;
  canViewDetails: boolean;
  canEdit: boolean;
  canEnroll: boolean;
  canActivate: boolean;
  canDeactivate: boolean;
  canDelete: boolean;
  hasAnyAction: boolean;
}

function UserActionMenuComponent({
  user,
  onViewDetails,
  onEdit,
  onEnroll,
  onUnenroll,
  onActivate,
  onDeactivate,
  onDelete,
  canViewDetails,
  canEdit,
  canEnroll,
  canActivate,
  canDeactivate,
  canDelete,
  hasAnyAction
}: UserActionMenuProps) {
  if (!hasAnyAction) return null;
  const isEnrolled = Number(user.biometrico_facial) === 1 || Number(user.biometrico_huella) === 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          aria-label='Más acciones'
          className='bg-white hover:bg-gray-200 rounded-full hover:scale-105 transition-all duration-200'
        >
          <MoreVertical className='w-3 h-3 sm:w-4 sm:h-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        {canViewDetails && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuItem
                  onClick={() => onViewDetails(user)}
                  className='cursor-pointer group'
                >
                  <Eye className='mr-2 text-blue-600 group-hover:text-blue-700 transition-colors w-3 h-3 sm:w-4 sm:h-4' />
                  <span className='group-hover:text-blue-700 transition-colors text-xs sm:text-sm'>
                    Ver detalles
                  </span>
                </DropdownMenuItem>
              </TooltipTrigger>
              <TooltipContent>Ver detalles del usuario</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {canEdit && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuItem onClick={() => onEdit(user)} className='cursor-pointer group'>
                  <Pencil className='mr-2 text-purple-600 group-hover:text-purple-700 transition-colors w-3 h-3 sm:w-4 sm:h-4' />
                  <span className='group-hover:text-purple-700 transition-colors text-xs sm:text-sm'>
                    Editar
                  </span>
                </DropdownMenuItem>
              </TooltipTrigger>
              <TooltipContent>Editar usuario</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {canEnroll && !isEnrolled && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuItem onClick={() => onEnroll(user)} className='cursor-pointer group'>
                  <Fingerprint className='mr-2 text-gray-600 group-hover:text-gray-900 transition-colors w-3 h-3 sm:w-4 sm:h-4' />
                  <span className='group-hover:text-gray-900 transition-colors text-xs sm:text-sm'>
                    Enrolar
                  </span>
                </DropdownMenuItem>
              </TooltipTrigger>
              <TooltipContent>Guardar referencia facial en el sistema</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {canEnroll && isEnrolled && (
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => onUnenroll(user)}>
              <UserMinus className='mr-2 size-4' />
              Desenrolar
            </DropdownMenuItem>
          </DropdownMenuGroup>
        )}

        {user.status === 0 && canActivate ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuItem
                  onClick={() => onActivate(user.id)}
                  className='cursor-pointer group'
                >
                  <Check className='mr-2 text-green-600 group-hover:text-green-700 transition-colors w-3 h-3 sm:w-4 sm:h-4' />
                  <span className='group-hover:text-green-700 transition-colors text-xs sm:text-sm'>
                    Activar
                  </span>
                </DropdownMenuItem>
              </TooltipTrigger>
              <TooltipContent>Activar usuario</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : user.status === 1 && canDeactivate ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuItem
                  onClick={() => onDeactivate(user.id)}
                  className='cursor-pointer group'
                >
                  <Power className='mr-2 text-orange-600 group-hover:text-orange-700 transition-colors w-3 h-3 sm:w-4 sm:h-4' />
                  <span className='group-hover:text-orange-700 transition-colors text-xs sm:text-sm'>
                    Desactivar
                  </span>
                </DropdownMenuItem>
              </TooltipTrigger>
              <TooltipContent>Desactivar usuario</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}

        {canDelete && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuItem
                  onClick={() => onDelete(user.id)}
                  className='cursor-pointer group'
                >
                  <Trash2 className='mr-2 text-red-600 group-hover:text-red-700 transition-colors w-3 h-3 sm:w-4 sm:h-4' />
                  <span className='group-hover:text-red-700 transition-colors text-xs sm:text-sm'>
                    Eliminar
                  </span>
                </DropdownMenuItem>
              </TooltipTrigger>
              <TooltipContent>Eliminar usuario permanentemente</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const UserActionMenu = memo(UserActionMenuComponent);
