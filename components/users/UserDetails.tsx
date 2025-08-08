import { Button } from '@/components/ui/button';
import { User } from '@/types/user';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AtSign,
  Phone,
  MapPin,
  TrendingUp,
  DollarSign,
  Coins,
  CreditCard,
  Building,
  Heart
} from 'lucide-react';

interface UserDetailsProps {
  user: User | null;
  onEdit: () => void;
  onClose: () => void;
}

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'Sin fecha';
  return format(new Date(dateString), 'PPP', { locale: es });
};

const getRoleBadgeColor = (role: string) => {
  const roleColors: { [key: string]: string } = {
    admin: 'bg-purple-100 text-purple-900 hover:bg-purple-200',
    administrador: 'bg-purple-100 text-purple-900 hover:bg-purple-200',
    garzon: 'bg-blue-100 text-blue-900 hover:bg-blue-200',
    anfitriona: 'bg-red-100 text-red-900 hover:bg-red-200',
    cajero: 'bg-green-100 text-green-900 hover:bg-green-200',
    default: 'bg-gray-100 text-gray-900 hover:bg-gray-200'
  };

  const normalizedRole = role?.toLowerCase().trim() || 'default';
  return roleColors[normalizedRole] || roleColors['default'];
};

export function UserDetails({ user, onEdit }: UserDetailsProps) {
  if (!user) return null;

  const formatCurrency = (
    value: number | string | undefined,
    type: 'sueldo' | 'aporte' | 'descuento' = 'sueldo'
  ): string => {
    if (value === undefined || value === null) {
      return type === 'sueldo' ? 'Sin sueldo' : type === 'aporte' ? 'Sin aporte' : 'Sin descuento';
    }
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue) || numValue === 0) {
      return type === 'sueldo' ? 'Sin sueldo' : type === 'aporte' ? 'Sin aporte' : 'Sin descuento';
    }
    return `$${new Intl.NumberFormat('es-CL', {
      style: 'decimal',
      maximumFractionDigits: 0
    }).format(numValue)}`;
  };

  return (
    <div className='w-full max-w-xl mx-auto'>
      <div className='flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 sm:gap-6 mb-4 sm:mb-6'>
        <div className='flex items-center space-x-3 sm:space-x-4'>
          <Avatar className='h-12 w-12 sm:h-16 sm:w-16'>
            <AvatarImage
              src={user.foto ? `/img/users/${user.foto}` : '/img/users/default.png'}
              alt={user.name}
            />
            <AvatarFallback className='bg-gray-200 text-sm sm:text-lg'>
              {user.name ? user.name[0].toUpperCase() : ''}
              {user.lastName ? user.lastName[0].toUpperCase() : ''}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className='text-lg sm:text-xl lg:text-2xl font-bold'>
              {user.name} {user.lastName}
            </h2>
            <div className='flex items-center mt-1 space-x-2'>
              <Badge
                className={`text-xs sm:text-sm ${
                  user.status === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {user.status === 1 ? 'Activo' : 'Inactivo'}
              </Badge>
              <Badge className={`${getRoleBadgeColor(user.role)} text-xs sm:text-sm`}>
                {user.role || 'Sin rol'}
              </Badge>
            </div>
          </div>
        </div>
        <div className='flex flex-col sm:flex-row gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={onEdit}
            className='rounded-full bg-black text-white hover:scale-105 transition-all duration-200 text-xs sm:text-sm w-full sm:w-auto'
          >
            Editar
          </Button>
        </div>
      </div>
      <div className='space-y-4 sm:space-y-6'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6'>
          {/* Información Personal */}
          <div className='space-y-3 sm:space-y-4'>
            <h3 className='font-semibold text-gray-700 text-sm sm:text-base'>
              Información Personal
            </h3>
            <div className='space-y-2 sm:space-y-3'>
              <div className='flex items-start'>
                <CreditCard className='h-3 w-3 sm:h-4 sm:w-4 mt-1 mr-2 text-gray-400 flex-shrink-0' />
                <div>
                  <p className='text-xs sm:text-sm font-medium'>RUN</p>
                  <p className='text-xs sm:text-sm text-gray-600'>
                    {user.run || 'No especificado'}
                  </p>
                </div>
              </div>

              <div className='flex items-start'>
                <AtSign className='h-3 w-3 sm:h-4 sm:w-4 mt-1 mr-2 text-gray-400 flex-shrink-0' />
                <div>
                  <p className='text-xs sm:text-sm font-medium'>Email</p>
                  <p className='text-xs sm:text-sm text-gray-600'>
                    {user.email || 'No especificado'}
                  </p>
                </div>
              </div>

              <div className='flex items-start'>
                <Phone className='h-3 w-3 sm:h-4 sm:w-4 mt-1 mr-2 text-gray-400 flex-shrink-0' />
                <div>
                  <p className='text-xs sm:text-sm font-medium'>Teléfono</p>
                  <p className='text-xs sm:text-sm text-gray-600'>
                    {user.phone || 'No especificado'}
                  </p>
                </div>
              </div>

              <div className='flex items-start'>
                <MapPin className='h-3 w-3 sm:h-4 sm:w-4 mt-1 mr-2 text-gray-400 flex-shrink-0' />
                <div>
                  <p className='text-xs sm:text-sm font-medium'>Dirección</p>
                  <p className='text-xs sm:text-sm text-gray-600'>
                    {user.address || 'No especificada'}
                  </p>
                </div>
              </div>

              <div className='flex items-start'>
                <Heart className='h-3 w-3 sm:h-4 sm:w-4 mt-1 mr-2 text-gray-400 flex-shrink-0' />
                <div>
                  <p className='text-xs sm:text-sm font-medium'>Estado Civil</p>
                  <Badge
                    className={`mt-1 text-xs sm:text-sm ${
                      ['Soltero', 'Soltera'].includes(user.maritalStatus || '')
                        ? 'bg-green-100 text-green-700'
                        : ['Casado', 'Casada'].includes(user.maritalStatus || '')
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {user.maritalStatus || 'Sin estado civil'}
                  </Badge>
                </div>
              </div>

              <div className='flex items-start'>
                <Building className='h-3 w-3 sm:h-4 sm:w-4 mt-1 mr-2 text-gray-400 flex-shrink-0' />
                <div>
                  <p className='text-xs sm:text-sm font-medium'>AFP</p>
                  <p className='text-xs sm:text-sm text-gray-600'>
                    {user.afp || 'No especificada'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Información Financiera */}
          <div className='space-y-3 sm:space-y-4'>
            <h3 className='font-semibold text-gray-700 text-sm sm:text-base'>
              Información Financiera
            </h3>
            <div className='space-y-2 sm:space-y-3'>
              <div className='flex items-start'>
                <TrendingUp className='h-3 w-3 sm:h-4 sm:w-4 mt-1 mr-2 text-gray-400 flex-shrink-0' />
                <div>
                  <p className='text-xs sm:text-sm font-medium'>Sueldo</p>
                  <p className='text-sm text-gray-600'>{formatCurrency(user.salary, 'sueldo')}</p>
                </div>
              </div>

              <div className='flex items-start'>
                <DollarSign className='h-4 w-4 mt-1 mr-2 text-gray-400 flex-shrink-0' />
                <div>
                  <p className='text-sm font-medium'>Aporte AFP</p>
                  <p className='text-sm text-gray-600'>
                    {formatCurrency(user.contributions, 'aporte')}
                  </p>
                </div>
              </div>

              <div className='flex items-start'>
                <Coins className='h-4 w-4 mt-1 mr-2 text-gray-400 flex-shrink-0' />
                <div>
                  <p className='text-sm font-medium'>Descuento de habitación</p>
                  <p className='text-sm text-gray-600'>
                    {formatCurrency(user.discount, 'descuento')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Información de Registro */}
        <div className='space-y-4'>
          <h3 className='font-semibold text-gray-700 text-md'>Registro</h3>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div>
              <p className='text-sm font-medium text-gray-500'>Fecha de Creación</p>
              <p className='text-sm text-gray-600'>{formatDate(user.created_at)}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-gray-500'>Última Actualización</p>
              <p className='text-sm text-gray-600'>{formatDate(user.updated_at)}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-gray-500'>Fecha de Eliminación</p>
              <p className='text-sm text-gray-600'>{formatDate(user.deleted_at)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
