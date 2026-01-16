import { User as UserType } from '@/types/user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  AtSign,
  Phone,
  MapPin,
  Power,
  Check,
  User,
  Calendar,
  DollarSign,
  PiggyBank,
  Home
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@radix-ui/react-label';
import { formatCurrencyNoDecimals } from '@/lib/formatters';

interface UserTableProps {
  users: UserType[];
  onViewDetails: (user: UserType) => void;
  onEdit: (user: UserType) => void;
  onActivate: (userId: number) => void;
  onDeactivate: (userId: number) => void;
  onDelete: (userId: number) => void;
  formatCurrency: (
    value: number | string | undefined,
    type: 'sueldo' | 'aporte' | 'descuento'
  ) => string;
  formatDate: (dateString: string) => string;
  getRoleBadgeColor: (role: string) => string;
  currentPage: number;
  pageSize: number;
}

export function UserTable({
  users,
  onViewDetails,
  onEdit,
  onActivate,
  onDeactivate,
  onDelete,
  formatDate,
  getRoleBadgeColor,
  currentPage,
  pageSize
}: UserTableProps) {
  if (users.length === 0) {
    return (
      <div className='py-8 text-center text-gray-500 text-sm sm:text-base'>
        No se encontraron usuarios que coincidan con la búsqueda
      </div>
    );
  }

  // Vista de tarjetas para móviles
  const MobileCardView = () => (
    <div className='lg:hidden space-y-3'>
      {users.length === 0 ? (
        <Card className='p-6 text-center'>
          <p className='text-gray-500 text-sm sm:text-base'>No hay usuarios</p>
        </Card>
      ) : (
        users.map((user, idx) => (
          <Card key={user.id} className='p-4 sm:p-6'>
            <CardContent className='space-y-3'>
              {/* Header con número, estado y acciones */}
              <div className='flex justify-between items-start'>
                <Badge className='bg-purple-100 text-purple-700 rounded-full px-3 py-1 text-xs sm:text-sm'>
                  {(currentPage - 1) * pageSize + idx + 1}
                </Badge>
                <div className='flex items-center gap-2'>
                  <Badge
                    className={`text-xs sm:text-sm ${
                      user.status === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {user.status === 1 ? 'Activo' : 'Inactivo'}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='bg-white hover:bg-gray-200 rounded-full hover:scale-105 transition-all duration-200 p-2'
                      >
                        <MoreVertical className='w-3 h-3 sm:w-4 sm:h-4' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end' className='w-40'>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuItem
                              onClick={() => onViewDetails(user)}
                              className='cursor-pointer group'
                            >
                              <Eye
                                className='mr-2 text-blue-600 group-hover:text-blue-700 transition-colors w-3 h-3 sm:w-4 sm:h-4'
                              />
                              <span className='group-hover:text-blue-700 transition-colors text-sm sm:text-base'>
                                Ver detalles
                              </span>
                            </DropdownMenuItem>
                          </TooltipTrigger>
                          <TooltipContent>Ver detalles del usuario</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuItem
                              onClick={() => onEdit(user)}
                              className='cursor-pointer group'
                            >
                              <Pencil
                                className='mr-2 text-purple-600 group-hover:text-purple-700 transition-colors w-3 h-3 sm:w-4 sm:h-4'
                              />
                              <span className='group-hover:text-purple-700 transition-colors text-sm sm:text-base'>
                                Editar
                              </span>
                            </DropdownMenuItem>
                          </TooltipTrigger>
                          <TooltipContent>Editar usuario</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {user.status === 0 ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuItem
                                onClick={() => onActivate(user.id)}
                                className='cursor-pointer group'
                              >
                                <Check
                                  className='mr-2 text-green-600 group-hover:text-green-700 transition-colors w-3 h-3 sm:w-4 sm:h-4'
                                />
                                <span className='group-hover:text-green-700 transition-colors text-sm sm:text-base'>
                                  Activar
                                </span>
                              </DropdownMenuItem>
                            </TooltipTrigger>
                            <TooltipContent>Activar usuario</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuItem
                                onClick={() => onDeactivate(user.id)}
                                className='cursor-pointer group'
                              >
                                <Power
                                  className='mr-2 text-orange-600 group-hover:text-orange-700 transition-colors w-3 h-3 sm:w-4 sm:h-4'
                                />
                                <span className='group-hover:text-orange-700 transition-colors text-sm sm:text-base'>
                                  Desactivar
                                </span>
                              </DropdownMenuItem>
                            </TooltipTrigger>
                            <TooltipContent>Desactivar usuario</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuItem
                              onClick={() => onDelete(user.id)}
                              className='cursor-pointer group'
                            >
                              <Trash2
                                className='mr-2 text-red-600 group-hover:text-red-700 transition-colors w-3 h-3 sm:w-4 sm:h-4'
                              />
                              <span className='group-hover:text-red-700 transition-colors text-sm sm:text-base'>
                                Eliminar
                              </span>
                            </DropdownMenuItem>
                          </TooltipTrigger>
                          <TooltipContent>Eliminar usuario</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Información del usuario en dos columnas */}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                {/* Columna izquierda - Información personal */}
                <div className='space-y-2'>
                  <div className='flex items-center gap-2'>
                    <Avatar className='h-8 w-8 sm:h-10 sm:w-10'>
                      <AvatarImage
                        src={`/img/users/${user.foto}` || '/img/users/default.png'}
                        alt={user.name}
                      />
                      <AvatarFallback className='text-xs sm:text-sm'>
                        {user.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className='flex-1'>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium text-sm sm:text-base'>
                          {user.name} {user.lastName}
                        </span>
                        <Badge
                          className={`text-xs ${
                            ['Soltero', 'Soltera'].includes(user.maritalStatus)
                              ? 'bg-green-100 text-green-700'
                              : ['Casado', 'Casada'].includes(user.maritalStatus)
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
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
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  // Vista de tabla para desktop
  const DesktopTableView = () => (
    <div className='hidden lg:block'>
      <Table className='min-w-full text-base bg-white rounded-xl overflow-hidden text-center'>
        <TableHeader className='border-b last:border-b-0 bg-white group'>
          <TableRow>
     
            <TableHead className='py-3 px-2 sm:px-4 text-start text-xs sm:text-sm text-gray-400'>
              Usuario
            </TableHead>
            <TableHead className='py-3 px-2 sm:px-4 text-start text-xs sm:text-sm text-gray-400'>
              Información
            </TableHead>
            <TableHead className='py-3 px-2 sm:px-4 text-start text-xs sm:text-sm text-gray-400'>
              Finanzas
            </TableHead>
            <TableHead className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-400'>
              Rol
            </TableHead>
            <TableHead className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-400'>
              Estado
            </TableHead>
            <TableHead className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-400'>
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={7}
                className='py-8 text-center text-gray-500 text-sm sm:text-base'
              >
                No se encontraron usuarios que coincidan con la búsqueda
              </TableCell>
            </TableRow>
          )}
          {users.map((user, idx) => (
            <TableRow
              key={user.id}
              className={`border-b bg-white group ${
                idx === 0 ? 'first:rounded-t-xl' : ''
              } ${idx === users.length - 1 ? 'last:rounded-b-xl' : ''}`}
            >
              
              <TableCell className='py-3 px-2 sm:px-4 text-start'>
                <div className='flex items-center space-x-2 sm:space-x-3'>
                  <Avatar className='h-8 w-8 sm:h-10 sm:w-10'>
                    <AvatarImage
                      src={`/img/users/${user.foto}` || '/img/users/default.png'}
                      alt={user.name}
                    />
                    <AvatarFallback className='text-xs sm:text-sm'>
                      {user.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className='text-left space-y-1'>
                    <div className='flex items-center space-x-2'>
                      <p className='font-medium text-gray-900 text-xs sm:text-sm'>
                        {user.name} {user.lastName}
                      </p>
                      <Badge
                        className={`text-xs ${
                          ['Soltero', 'Soltera'].includes(user.maritalStatus)
                            ? 'bg-green-100 text-green-700'
                            : ['Casado', 'Casada'].includes(user.maritalStatus)
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
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
              </TableCell>
              <TableCell className='py-3 px-2 sm:px-4 text-start'>
                <div className='space-y-1'>
                  <div className='flex items-center space-x-2'>
                    <AtSign className='text-gray-400 w-3 h-3 sm:w-4 sm:h-4' />
                    <span className='text-xs sm:text-sm'>{user.email}</span>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <Phone
                      className='text-gray-400 w-3 h-3 sm:w-4 sm:h-4'
                    />
                    <span className='text-xs sm:text-sm'>{user.phone}</span>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <MapPin
                      className='text-gray-400 w-3 h-3 sm:w-4 sm:h-4'
                    />
                    <span className='text-xs sm:text-sm'>{user.address || 'Sin dirección'}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className='py-3 px-2 sm:px-4 text-center'>
                <div className='space-y-1'>
                  <div className='flex items-start justify-start space-x-2'>
                    <Label className='text-xs sm:text-sm text-gray-600'>Sueldo</Label>
                    <span className='text-xs sm:text-sm font-medium'>
                      {formatCurrencyNoDecimals(user.salary)}
                    </span>
                  </div>
                  <div className='flex items-start justify-start space-x-2'>
                    <Label className='text-xs sm:text-sm text-gray-600'>Aporte AFP</Label>
                    <span className='text-xs sm:text-sm font-medium'>
                      {formatCurrencyNoDecimals(user.contributions)}
                    </span>
                  </div>
                  <div className='flex items-start justify-start space-x-2'>
                    <Label className='text-xs sm:text-sm text-gray-600'>Descuento habitacion</Label>
                    <span className='text-xs sm:text-sm font-medium'>
                      {user.discount && user.discount > 0
                        ? formatCurrencyNoDecimals(user.discount)
                        : 'Sin descuento'}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className='py-3 px-2 sm:px-4 text-center'>
                <Badge className={`${getRoleBadgeColor(user.role)} text-xs sm:text-sm`}>
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell className='py-3 px-2 sm:px-4 text-center'>
                <Badge
                  className={`text-xs sm:text-sm ${
                    user.status === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {user.status === 1 ? 'Activo' : 'Inactivo'}
                </Badge>
              </TableCell>
              <TableCell className='py-3 px-2 sm:px-4 text-center'>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='bg-white hover:bg-gray-200 rounded-full hover:scale-105 transition-all duration-200'
                    >
                      <MoreVertical className='w-3 h-3 sm:w-4 sm:h-4' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuItem
                            onClick={() => onViewDetails(user)}
                            className='cursor-pointer group'
                          >
                            <Eye
                              className='mr-2 text-blue-600 group-hover:text-blue-700 transition-colors w-3 h-3 sm:w-4 sm:h-4'
                            />
                            <span className='group-hover:text-blue-700 transition-colors text-xs sm:text-sm'>
                              Ver detalles
                            </span>
                          </DropdownMenuItem>
                        </TooltipTrigger>
                        <TooltipContent>Ver detalles del usuario</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuItem
                            onClick={() => onEdit(user)}
                            className='cursor-pointer group'
                          >
                            <Pencil
                              className='mr-2 text-purple-600 group-hover:text-purple-700 transition-colors w-3 h-3 sm:w-4 sm:h-4'
                            />
                            <span className='group-hover:text-purple-700 transition-colors text-xs sm:text-sm'>
                              Editar
                            </span>
                          </DropdownMenuItem>
                        </TooltipTrigger>
                        <TooltipContent>Editar usuario</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {user.status === 0 ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuItem
                              onClick={() => onActivate(user.id)}
                              className='cursor-pointer group'
                            >
                              <Check
                                className='mr-2 text-green-600 group-hover:text-green-700 transition-colors w-3 h-3 sm:w-4 sm:h-4'
                              />
                              <span className='group-hover:text-green-700 transition-colors text-xs sm:text-sm'>
                                Activar
                              </span>
                            </DropdownMenuItem>
                          </TooltipTrigger>
                          <TooltipContent>Activar usuario</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuItem
                              onClick={() => onDeactivate(user.id)}
                              className='cursor-pointer group'
                            >
                              <Power
                                className='mr-2 text-orange-600 group-hover:text-orange-700 transition-colors w-3 h-3 sm:w-4 sm:h-4'
                              />
                              <span className='group-hover:text-orange-700 transition-colors text-xs sm:text-sm'>
                                Desactivar
                              </span>
                            </DropdownMenuItem>
                          </TooltipTrigger>
                          <TooltipContent>Desactivar usuario</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuItem
                            onClick={() => onDelete(user.id)}
                            className='cursor-pointer group'
                          >
                            <Trash2
                              className='mr-2 text-red-600 group-hover:text-red-700 transition-colors w-3 h-3 sm:w-4 sm:h-4'
                            />
                            <span className='group-hover:text-red-700 transition-colors text-xs sm:text-sm'>
                              Eliminar
                            </span>
                          </DropdownMenuItem>
                        </TooltipTrigger>
                        <TooltipContent>Eliminar usuario permanentemente</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <TooltipProvider>
      <MobileCardView />
      <DesktopTableView />
    </TooltipProvider>
  );
}
