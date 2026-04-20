'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { LazyQRCode } from '@/components/shared/LazyQRCode';
import type { ProfileUserData, ProfileUserOption } from './profile-types';

interface ProfileUserSelectorProps {
  selectedUserId: string;
  loadingUsers: boolean;
  loadingUserData: boolean;
  usersList: ProfileUserOption[];
  userData: ProfileUserData | null;
  onUserChange: (userId: string) => void;
  onRefreshQr: () => void;
}

export function ProfileUserSelector({
  selectedUserId,
  loadingUsers,
  loadingUserData,
  usersList,
  userData,
  onUserChange,
  onRefreshQr
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

        {userData?.qr_token && (
          <div className='mt-8 p-6 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-center'>
            <h3 className='text-lg font-bold text-slate-900 mb-2'>Mi QR de Asistencia</h3>
            <p className='text-sm text-slate-600 mb-6'>
              Escaneá este código con tu aplicación móvil para registrar tu presencia.
            </p>
            <div className='inline-block p-4 bg-white rounded-2xl shadow-sm border border-slate-100'>
              <LazyQRCode value={userData.qr_token} size={200} level='M' includeMargin={true} />
            </div>
            <div className='mt-4 flex flex-col items-center gap-2'>
              <p className='text-[10px] font-mono text-slate-400 select-all'>
                TOKEN: {userData.qr_token}
              </p>
              <Button
                variant='ghost'
                size='sm'
                className='text-xs text-blue-600 h-8 rounded-full'
                onClick={onRefreshQr}
              >
                Actualizar Código
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
