'use client';

import { Button } from '@/components/ui/button';
import type { ProfileCurrentUser } from './profile-types';

interface ProfileHeaderProps {
  currentUser: ProfileCurrentUser | null;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}

export function ProfileHeader({
  currentUser,
  isEditing,
  onEdit,
  onCancel,
  onSave
}: ProfileHeaderProps) {
  return (
    <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6'>
      <div>
        <h1 className='text-3xl font-bold'>Perfil de Usuario</h1>
        {currentUser && (
          <p className='text-sm text-muted-foreground mt-1'>
            Conectado como:{' '}
            <span className='font-medium'>
              {currentUser.name} {currentUser.lastName}
            </span>
            <span className='ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded'>
              {currentUser.role}
            </span>
          </p>
        )}
      </div>
      {!isEditing ? (
        <Button
          onClick={onEdit}
          variant='outline'
          className='whitespace-nowrap inline-flex items-center bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-xs sm:text-sm px-2 sm:px-3'
        >
          Editar Perfil
        </Button>
      ) : (
        <div className='flex gap-2'>
          <Button
            onClick={onCancel}
            variant='outline'
            className='whitespace-nowrap inline-flex items-center hover:bg-black hover:text-white rounded-full hover:scale-105 transition-all duration-200 text-xs sm:text-sm px-2 sm:px-3'
          >
            Cancelar
          </Button>
          <Button
            onClick={onSave}
            variant='outline'
            className='whitespace-nowrap inline-flex items-center bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-xs sm:text-sm px-2 sm:px-3'
          >
            Guardar Cambios
          </Button>
        </div>
      )}
    </div>
  );
}
