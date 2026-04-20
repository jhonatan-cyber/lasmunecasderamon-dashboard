'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { ProfileUserData } from './profile-types';

interface ProfileSecurityCardProps {
  userData: ProfileUserData;
  isChangingPassword: boolean;
  confirmPassword: string;
  onChangePasswordMode: () => void;
  onCancelPasswordChange: () => void;
  onPasswordChange: (password: string) => void;
  onConfirmPasswordChange: (password: string) => void;
  onSavePassword: () => void;
  getLoginTimeLabel: () => string;
  formatDate: (dateString: string | null) => string;
}

export function ProfileSecurityCard({
  userData,
  isChangingPassword,
  confirmPassword,
  onChangePasswordMode,
  onCancelPasswordChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSavePassword,
  getLoginTimeLabel,
  formatDate
}: ProfileSecurityCardProps) {
  const passwordStrengthClass =
    (userData.password || '').length < 6
      ? 'bg-red-500'
      : (userData.password || '').length < 8
        ? 'bg-yellow-500'
        : (userData.password || '').length < 10
          ? 'bg-blue-500'
          : 'bg-green-500';

  const passwordStrengthTextClass =
    (userData.password || '').length < 6
      ? 'text-red-600'
      : (userData.password || '').length < 8
        ? 'text-yellow-600'
        : (userData.password || '').length < 10
          ? 'text-blue-600'
          : 'text-green-600';

  const passwordStrengthLabel =
    (userData.password || '').length < 6
      ? 'Débil'
      : (userData.password || '').length < 8
        ? 'Media'
        : (userData.password || '').length < 10
          ? 'Buena'
          : 'Excelente';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seguridad</CardTitle>
        <CardDescription>Gestioná tu contraseña y configuraciones de seguridad</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {!isChangingPassword ? (
          <>
            <div className='space-y-3'>
              <div>
                <Label htmlFor='password'>Contraseña</Label>
                <Input
                  id='password'
                  type='password'
                  value='••••••••'
                  disabled
                  className='bg-muted'
                />
                <p className='text-xs text-muted-foreground mt-1'>Tu contraseña está segura</p>
              </div>
            </div>

            <Button
              variant='outline'
              className='w-full whitespace-nowrap inline-flex items-center justify-center bg-black text-white rounded-full transition-all duration-200 text-xs sm:text-sm px-2 sm:px-3'
              onClick={onChangePasswordMode}
            >
              Cambiar Contraseña
            </Button>
          </>
        ) : (
          <>
            <div className='space-y-3'>
              <div>
                <Label htmlFor='new-password'>Nueva Contraseña</Label>
                <Input
                  id='new-password'
                  type='password'
                  value={userData.password || ''}
                  onChange={e => onPasswordChange(e.target.value)}
                  placeholder='Ingresá tu nueva contraseña'
                />
                {userData.password && (
                  <div className='mt-1'>
                    <div className='flex space-x-1'>
                      <div className={`h-1 flex-1 rounded ${passwordStrengthClass}`}></div>
                    </div>
                    <p className={`text-xs mt-1 ${passwordStrengthTextClass}`}>
                      {passwordStrengthLabel}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor='confirm-password'>Confirmar Nueva Contraseña</Label>
                <Input
                  id='confirm-password'
                  type='password'
                  value={confirmPassword}
                  onChange={e => onConfirmPasswordChange(e.target.value)}
                  placeholder='Confirmá tu nueva contraseña'
                />
                {confirmPassword && userData.password && confirmPassword !== userData.password && (
                  <p className='text-xs text-red-600 mt-1'>Las contraseñas no coinciden</p>
                )}
              </div>
            </div>

            <div className='flex gap-2'>
              <Button
                variant='outline'
                className='flex-1 whitespace-nowrap inline-flex items-center justify-center bg-gray-100 text-gray-700 border border-gray-300 rounded-full hover:scale-105 transition-all duration-200 text-xs sm:text-sm px-2 sm:px-3'
                onClick={onCancelPasswordChange}
              >
                Cancelar
              </Button>
              <Button
                variant='default'
                className='flex-1 whitespace-nowrap inline-flex items-center justify-center bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-xs sm:text-sm px-2 sm:px-3'
                onClick={onSavePassword}
              >
                Guardar Contraseña
              </Button>
            </div>
          </>
        )}

        <Separator className='my-4' />
        <div>
          <h4 className='text-sm font-medium mb-3'>Actividad Reciente</h4>
          <div className='space-y-3'>
            <div className='flex items-center justify-between p-2 border rounded-lg'>
              <div>
                <p className='text-sm font-medium'>Inicio de sesión</p>
                <p className='text-xs text-muted-foreground'>{getLoginTimeLabel()}</p>
              </div>
              <span className='text-xs text-green-600'>Exitoso</span>
            </div>

            <div className='flex items-center justify-between p-2 border rounded-lg'>
              <div>
                <p className='text-sm font-medium'>Actualización de perfil</p>
                <p className='text-xs text-muted-foreground'>
                  {userData.fecha_mod ? formatDate(userData.fecha_mod) : 'Nunca'}
                </p>
              </div>
              <span className='text-xs text-blue-600'>Completado</span>
            </div>

            <div className='flex items-center justify-between p-2 border rounded-lg'>
              <div>
                <p className='text-sm font-medium'>Cambio de contraseña</p>
                <p className='text-xs text-muted-foreground'>
                  {userData.fecha_mod ? formatDate(userData.fecha_mod) : 'Nunca'}
                </p>
              </div>
              <span className='text-xs text-green-600'>Exitoso</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
