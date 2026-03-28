import { memo } from 'react';
import { User as UserType } from '@/types/user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { AtSign, Phone, MapPin, User, Calendar, DollarSign, PiggyBank, Home } from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';

interface UserInfoDisplayProps {
  user: UserType;
  formatDate: (dateString: string) => string;
  getRoleBadgeColor: (role: string) => string;
  variant?: 'card' | 'table';
}

function UserInfoDisplayComponent({ user, formatDate, getRoleBadgeColor, variant = 'card' }: UserInfoDisplayProps) {
  const getMaritalStatusColor = (status: string) => {
    if (['Soltero', 'Soltera'].includes(status)) return 'bg-green-100 text-green-700';
    if (['Casado', 'Casada'].includes(status)) return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  if (variant === 'table') {
    return (
      <div className='flex items-center space-x-2 sm:space-x-3'>
        <Avatar className='h-8 w-8 sm:h-10 sm:w-10'>
          <AvatarImage
            src={user.foto 
              ? (user.foto.startsWith('http') ? user.foto : `/img/users/${user.foto}`) 
              : '/img/users/default.png'}
            alt={user.name || user.nick || 'Usuario'}
            asChild
          >
            <Image
              src={user.foto 
                ? (user.foto.startsWith('http') ? user.foto : `/img/users/${user.foto}`) 
                : '/img/users/default.png'}
              alt={user.name || user.nick || 'Usuario'}
              width={40}
              height={40}
              loading="lazy"
              className="object-cover"
            />
          </AvatarImage>
          <AvatarFallback className='text-xs sm:text-sm'>
            {user.name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className='text-left space-y-1'>
          <div className='flex items-center space-x-2'>
            <p className='font-medium text-gray-900 text-xs sm:text-sm'>
              {user.name} {user.lastName}
            </p>
            <Badge className={`text-xs ${getMaritalStatusColor(user.maritalStatus)}`}>
              {user.maritalStatus || 'Sin estado civil'}
            </Badge>
          </div>
          <p className='text-xs sm:text-sm text-gray-500'>@{user.nick}</p>
          <p className='text-xs text-gray-400'>RUN: {user.run}</p>
          <div className='text-xs sm:text-sm text-gray-400'>
            Institucion de aporte:{' '}
            <Badge className='text-xs bg-blue-100 text-blue-700'>
              {user.afp || 'Sin AFP'}
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
      {/* Columna izquierda - Información personal */}
      <div className='space-y-2'>
        <div className='flex items-center gap-2'>
        <Avatar className='h-8 w-8 sm:h-10 sm:w-10'>
          <AvatarImage
            src={user.foto 
              ? (user.foto.startsWith('http') ? user.foto : `/img/users/${user.foto}`) 
              : '/img/users/default.png'}
            alt={user.name || user.nick || 'Usuario'}
            asChild
          >
            <Image
              src={user.foto 
                ? (user.foto.startsWith('http') ? user.foto : `/img/users/${user.foto}`) 
                : '/img/users/default.png'}
              alt={user.name || user.nick || 'Usuario'}
              width={40}
              height={40}
              loading="lazy"
              className="object-cover"
            />
          </AvatarImage>
            <AvatarFallback className='text-xs sm:text-sm'>
              {user.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className='flex-1'>
            <div className='flex items-center gap-2'>
              <span className='font-medium text-sm sm:text-base'>
                {user.name} {user.lastName}
              </span>
              <Badge className={`text-xs ${getMaritalStatusColor(user.maritalStatus)}`}>
                {user.maritalStatus || 'Sin estado civil'}
              </Badge>
            </div>
            <div className='text-xs sm:text-sm text-gray-500'>
              @{user.nick}{' '}
              <Badge className={`${getRoleBadgeColor(user.role)} text-xs sm:text-sm`}>
                {user.role}
              </Badge>
            </div>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <User className='h-3 w-3 text-gray-400' />
          <span className='text-xs sm:text-sm text-gray-600'>RUN: {user.run}</span>
        </div>

        <div className='flex items-center gap-2'>
          <AtSign className='h-3 w-3 text-gray-400' />
          <span className='text-xs sm:text-sm text-gray-600'>{user.email}</span>
        </div>

        <div className='flex items-center gap-2'>
          <Phone className='h-3 w-3 text-gray-400' />
          <span className='text-xs sm:text-sm text-gray-600'>
            Telefono : {user.phone}
          </span>
        </div>

        <div className='flex items-center gap-2'>
          <MapPin className='h-3 w-3 text-gray-400' />
          <span className='text-xs sm:text-sm text-gray-500'>
            Direccion : {user.address || 'Sin dirección'}
          </span>
        </div>

        <div className='flex items-center gap-2'>
          <Calendar className='h-3 w-3 text-gray-400' />
          <span className='text-xs sm:text-sm text-gray-500'>
            Fecha creacion : {user.created_at ? formatDate(user.created_at) : 'Sin fecha'}
          </span>
        </div>
      </div>
      
      {/* Columna derecha - Información financiera */}
      <div className='space-y-2'>
        <div className='text-xs font-medium text-gray-700 mb-2'>
          Información Financiera
        </div>

        <div className='flex items-center gap-2'>
          <DollarSign className='h-3 w-3 text-green-600' />
          <span className='text-xs sm:text-sm text-gray-600'>
            Sueldo: {formatCurrencyNoDecimals(user.salary)}
          </span>
        </div>

        <div className='flex items-center gap-2'>
          <PiggyBank className='h-3 w-3 text-blue-600' />
          <span className='text-xs sm:text-sm text-gray-600'>
            Aporte: {formatCurrencyNoDecimals(user.contributions)}
          </span>
        </div>

        <div className='flex items-center gap-2'>
          <Home className='h-3 w-3 text-orange-600' />
          <span className='text-xs sm:text-sm text-gray-600'>
            Descuento:{' '}
            {user.discount && user.discount > 0
              ? formatCurrencyNoDecimals(user.discount)
              : 'Sin descuento'}
          </span>
        </div>
        
        <div className='flex items-center gap-2'>
          <Home className='h-3 w-3 text-blue-600' />
          <span className='text-xs sm:text-sm text-gray-600'>
            Institucion de aporte :
            <Badge className='text-xs bg-blue-100 text-blue-700'>
              {user.afp || 'Sin AFP'}
            </Badge>{' '}
          </span>
        </div>
      </div>
    </div>
  );
}

export const UserInfoDisplay = memo(UserInfoDisplayComponent);
