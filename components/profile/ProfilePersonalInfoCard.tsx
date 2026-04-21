'use client';

import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import type { ProfileCurrentUser, ProfileRoleOption, ProfileUserData } from './profile-types';

interface ProfilePersonalInfoCardProps {
  currentUser: ProfileCurrentUser | null;
  userData: ProfileUserData;
  isAdmin: boolean;
  isEditing: boolean;
  loadingRoles: boolean;
  rolesList: ProfileRoleOption[];
  newImagePreview: string | null;
  onUserDataChange: (data: ProfileUserData) => void;
  onNickChange: (nick: string) => void;
  onAdminNickChange: (nick: string) => void;
  onImagePreviewChange: (preview: string | null) => void;
}

const maritalStatusOptions = [
  { value: 'Soltero', label: 'Soltero/a' },
  { value: 'Casado', label: 'Casado/a' },
  { value: 'Divorciado', label: 'Divorciado/a' },
  { value: 'Viudo', label: 'Viudo/a' },
  { value: 'Separado', label: 'Separado/a' }
];

export function ProfilePersonalInfoCard({
  currentUser,
  userData,
  isAdmin,
  isEditing,
  loadingRoles,
  rolesList,
  newImagePreview,
  onUserDataChange,
  onNickChange,
  onAdminNickChange,
  onImagePreviewChange
}: ProfilePersonalInfoCardProps) {
  const isSpecialRole =
    userData.role?.toLowerCase() === 'anfitriona' || userData.role?.toLowerCase() === 'garzon';
  const firstName = userData.nombre?.trim() || '';
  const lastName = userData.apellido?.trim() || '';
  const fullName =
    `${firstName} ${lastName}`.trim() || userData.nick?.trim() || userData.email || 'Usuario';
  const avatarFallback =
    firstName.charAt(0) || lastName.charAt(0) || userData.nick?.trim().charAt(0) || 'U';

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Información Personal
          {isAdmin && userData.id.toString() !== currentUser?.id?.toString() && (
            <span className='ml-2 text-sm font-normal text-orange-600 bg-orange-100 px-2 py-1 rounded'>
              Editando perfil de otro usuario
            </span>
          )}
        </CardTitle>
        <CardDescription>
          {isAdmin && userData.id.toString() !== currentUser?.id?.toString()
            ? `Editando información de ${fullName}`
            : 'Gestioná tu información personal y preferencias'}
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='flex items-center space-x-4'>
          <Avatar className='h-20 w-20'>
            <AvatarImage
              src={userData.foto ? `/img/users/${userData.foto}` : '/placeholder-user.jpg'}
              alt={fullName}
              onError={e => {
                e.currentTarget.src = '/placeholder-user.jpg';
              }}
            />
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className='text-lg font-semibold'>{fullName}</h3>
            <p className='text-sm text-muted-foreground'>{userData.role}</p>
            <p className='text-xs text-muted-foreground'>RUN: {userData.run}</p>
          </div>
        </div>

        <Separator />

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          {isAdmin ? (
            <>
              <div>
                <Label htmlFor='run'>RUN *</Label>
                <Input
                  id='run'
                  value={userData.run || ''}
                  onChange={e => onUserDataChange({ ...userData, run: e.target.value })}
                  disabled={!isEditing}
                  placeholder='12.345.678-9'
                />
              </div>

              <div>
                <Label htmlFor='nick'>Nickname</Label>
                <Input
                  id='nick'
                  value={userData.nick || ''}
                  onChange={e => onAdminNickChange(e.target.value)}
                  disabled={!isEditing || isSpecialRole}
                  placeholder='usuario123'
                />
                <p className='mt-1 text-xs text-muted-foreground'>
                  El email se actualizará automáticamente: {userData.nick}@lasmuñecasderamon.com
                  {isSpecialRole && (
                    <span className='font-medium text-orange-600'>
                      {' '}
                      - No editable para anfitrionas y garzones
                    </span>
                  )}
                </p>
              </div>

              <div>
                <Label htmlFor='nombre'>Nombre *</Label>
                <Input
                  id='nombre'
                  value={userData.nombre || ''}
                  onChange={e => onUserDataChange({ ...userData, nombre: e.target.value })}
                  disabled={!isEditing}
                  placeholder='Juan'
                />
              </div>

              <div>
                <Label htmlFor='apellido'>Apellido *</Label>
                <Input
                  id='apellido'
                  value={userData.apellido || ''}
                  onChange={e => onUserDataChange({ ...userData, apellido: e.target.value })}
                  disabled={!isEditing}
                  placeholder='Pérez'
                />
              </div>

              <div className='md:col-span-2'>
                <Label htmlFor='direccion'>Dirección</Label>
                <Input
                  id='direccion'
                  value={userData.direccion || ''}
                  onChange={e => onUserDataChange({ ...userData, direccion: e.target.value })}
                  disabled={!isEditing}
                  placeholder='Av. Principal 123, Santiago'
                />
              </div>

              <div>
                <Label htmlFor='telefono'>Teléfono</Label>
                <Input
                  id='telefono'
                  type='tel'
                  value={userData.telefono || ''}
                  onChange={e => onUserDataChange({ ...userData, telefono: e.target.value })}
                  disabled={!isEditing}
                  placeholder='+56 9 1234 5678'
                />
              </div>

              <div>
                <Label htmlFor='estado_civil'>Estado Civil</Label>
                <Select
                  value={userData.estado_civil || ''}
                  onValueChange={(value: string) =>
                    onUserDataChange({ ...userData, estado_civil: value })
                  }
                  disabled={!isEditing}
                >
                  <SelectTrigger className='rounded-full'>
                    <SelectValue placeholder='Seleccione estado civil' />
                  </SelectTrigger>
                  <SelectContent>
                    {maritalStatusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor='email'>Email</Label>
                <Input
                  id='email'
                  type='email'
                  value={userData.email || ''}
                  disabled
                  className='bg-muted'
                />
                <p className='mt-1 text-xs text-muted-foreground'>
                  Se actualiza automáticamente con el nickname: {userData.nick || ''}
                  @lasmuñecasderamon.com
                </p>
              </div>

              <div>
                <Label htmlFor='rol_id'>Rol</Label>
                <Select
                  value={userData.rol_id?.toString() || ''}
                  onValueChange={(value: string) =>
                    onUserDataChange({ ...userData, rol_id: value })
                  }
                  disabled={!isEditing}
                >
                  <SelectTrigger className='rounded-full'>
                    <SelectValue placeholder='Selecciona un rol'>
                      {loadingRoles
                        ? 'Cargando roles...'
                        : rolesList.find(role => role.id_rol === userData.rol_id)?.nombre ||
                          'Selecciona un rol'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {loadingRoles ? (
                      <SelectItem value='loading' disabled>
                        Cargando roles...
                      </SelectItem>
                    ) : rolesList.length === 0 ? (
                      <SelectItem value='no-roles' disabled>
                        No hay roles disponibles
                      </SelectItem>
                    ) : (
                      rolesList.map(role => (
                        <SelectItem key={role.id_rol} value={role.id_rol.toString()}>
                          {role.nombre}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className='mt-1 text-xs text-muted-foreground'>
                  Selecciona el rol del usuario (Roles disponibles: {rolesList.length})
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label htmlFor='nick'>Nickname *</Label>
                <Input
                  id='nick'
                  value={userData.nick || ''}
                  onChange={e => onNickChange(e.target.value)}
                  disabled={!isEditing || isSpecialRole}
                  placeholder='usuario123'
                />
                <p className='mt-1 text-xs text-muted-foreground'>
                  El email se actualizará automáticamente: {userData.nick || ''}
                  @lasmuñecasderamon.com
                  {isSpecialRole && (
                    <span className='font-medium text-orange-600'>
                      {' '}
                      - No editable para anfitrionas y garzones
                    </span>
                  )}
                </p>
              </div>

              <div>
                <Label htmlFor='email'>Email</Label>
                <Input
                  id='email'
                  type='email'
                  value={userData.email || ''}
                  disabled
                  className='bg-muted'
                />
                <p className='mt-1 text-xs text-muted-foreground'>
                  Se actualiza automáticamente con el nickname
                </p>
              </div>

              <div className='md:col-span-2'>
                <Label htmlFor='direccion'>Dirección</Label>
                <Input
                  id='direccion'
                  value={userData.direccion || ''}
                  onChange={e => onUserDataChange({ ...userData, direccion: e.target.value })}
                  disabled={!isEditing}
                  placeholder='Av. Principal 123, Santiago'
                />
              </div>

              <div>
                <Label htmlFor='telefono'>Teléfono</Label>
                <Input
                  id='telefono'
                  type='tel'
                  value={userData.telefono || ''}
                  onChange={e => onUserDataChange({ ...userData, telefono: e.target.value })}
                  disabled={!isEditing}
                  placeholder='+56 9 1234 5678'
                />
              </div>

              <div>
                <Label htmlFor='estado_civil'>Estado Civil</Label>
                <Select
                  value={userData.estado_civil || ''}
                  onValueChange={(value: string) =>
                    onUserDataChange({ ...userData, estado_civil: value })
                  }
                  disabled={!isEditing}
                >
                  <SelectTrigger className='rounded-full'>
                    <SelectValue placeholder='Seleccione estado civil' />
                  </SelectTrigger>
                  <SelectContent>
                    {maritalStatusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className='md:col-span-2'>
            <Label htmlFor='foto'>Foto de Perfil</Label>

            {newImagePreview && (
              <div className='mb-3'>
                <p className='mb-2 text-sm text-muted-foreground'>Nueva imagen seleccionada:</p>
                <div className='flex items-center space-x-3'>
                  <Image
                    src={newImagePreview}
                    alt='Nueva imagen'
                    width={64}
                    height={64}
                    unoptimized
                    className='h-16 w-16 rounded-full border object-cover'
                  />
                  <div>
                    <p className='text-xs text-muted-foreground'>Nueva imagen seleccionada</p>
                    <p className='text-xs text-muted-foreground'>
                      Se guardará al actualizar el perfil
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Input
              id='foto'
              type='file'
              accept='image/*'
              disabled={!isEditing}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = event => {
                    onImagePreviewChange(event.target?.result as string);
                  };
                  reader.readAsDataURL(file);
                } else {
                  onImagePreviewChange(null);
                }
              }}
            />
            <p className='mt-1 text-xs text-muted-foreground'>
              Formatos permitidos: JPG, PNG, GIF. Máximo 5MB.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
