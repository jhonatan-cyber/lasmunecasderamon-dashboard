'use client';

import Image from 'next/image';

import { User, ChevronDown, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toastUtils';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useUserImage } from '@/contexts/UserImageContext';

export function HeaderUserMenu() {
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();
  const { imageVersion } = useUserImage();

  const isAdmin = user?.role?.toLowerCase() === 'administrador';

  async function handleLogout() {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        showSuccessToast('Sesión cerrada exitosamente');
        setTimeout(() => {
          router.replace('/login');
        }, 3000);
      } else {
        showErrorToast('No se pudo cerrar la sesión');
      }
    } catch {
      showErrorToast('Error de red al cerrar sesión');
    }
  }

  if (userLoading) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='flex items-center gap-2 px-2 sm:px-3'>
          <Avatar className='h-8 w-8'>
            {user?.foto && user.foto !== '' ? (
              <Image
                src={`/img/users/${user.foto}?v=${imageVersion}`}
                alt={user ? `${user.name} ${user.lastName}` : 'Usuario'}
                width={32}
                height={32}
                className='w-full h-full object-cover rounded-full'
              />
            ) : (
              <AvatarImage src='/img/users/default.png' alt='Usuario' />
            )}
            <AvatarFallback>
              {user ? `${user.name?.[0] || ''}${user.lastName?.[0] || ''}` : 'U'}
            </AvatarFallback>
          </Avatar>
          <div className='text-left hidden sm:block'>
            <p className='text-sm font-medium'>
              {user ? `${user.name} ${user.lastName}` : 'Usuario'}
            </p>
            <p className='text-xs text-gray-500'>{user?.role || 'Sin rol'}</p>
          </div>
          <ChevronDown className='h-4 w-4 hidden sm:block' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-56'>
        <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/profile')}>
          <User className='mr-2 h-4 w-4' />
          Perfil
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem onClick={() => router.push('/settings')}>
            <Settings className='mr-2 h-4 w-4' />
            Configuración
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className='text-red-600' onClick={handleLogout}>
          Cerrar Sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
