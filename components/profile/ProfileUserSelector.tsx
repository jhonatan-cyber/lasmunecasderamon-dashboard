'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import type { ProfileUserData, ProfileUserOption } from './profile-types';

interface ProfileUserSelectorProps {
  selectedUserId: string;
  loadingUsers: boolean;
  loadingUserData: boolean;
  usersList: ProfileUserOption[];
  userData: ProfileUserData | null;
  onUserChange: (userId: string) => void;
}

export function ProfileUserSelector({
  selectedUserId,
  loadingUsers,
  loadingUserData,
  usersList,
  userData,
  onUserChange
}: ProfileUserSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Seleccionar Usuario</CardTitle>
        <CardDescription>
          Como administrador, podés editar el perfil de cualquier usuario del sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='flex items-center space-x-4'>
          <div className='flex-1'>
            <Label htmlFor='user-select'>Usuario a editar</Label>
            <Select value={selectedUserId} onValueChange={onUserChange}>
              <SelectTrigger className='rounded-full'>
                <SelectValue placeholder='Seleccioná un usuario' />
              </SelectTrigger>
              <SelectContent>
                {loadingUsers ? (
                  <SelectItem value='loading-users' disabled>
                    Cargando usuarios...
                  </SelectItem>
                ) : usersList.length === 0 ? (
                  <SelectItem value='no-users' disabled>
                    No hay usuarios disponibles
                  </SelectItem>
                ) : (
                  usersList.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      <div className='flex items-center space-x-2'>
                        <span>{`${user.name} ${user.lastName}`}</span>
                        <span className='text-muted-foreground'>({user.role})</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          {loadingUserData ? (
            <div className='text-sm text-muted-foreground'>Cargando datos...</div>
          ) : (
            selectedUserId &&
            userData && (
              <div className='text-sm text-muted-foreground'>
                Editando:{' '}
                <span className='font-medium'>{`${userData.nombre} ${userData.apellido}`}</span>
              </div>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
