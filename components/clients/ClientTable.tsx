import { Client } from '@/types/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { Trash, Pencil, Eye, Phone, User, Calendar, MoreVertical } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { DeleteClientConfirmModal } from './DeleteClientConfirmModal';
import { Card, CardContent } from '@/components/ui/card';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';

interface ClientTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onViewDetails: (client: Client) => void;
  currentPage: number;
  pageSize: number;
}

export function ClientTable({
  clients,
  onEdit,
  onDelete,
  onViewDetails,
  currentPage,
  pageSize
}: ClientTableProps) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const { hasPermission } = useUserPermissions();
  
  // Verificar permisos
  const canViewDetails = hasPermission('clientes', 'ver_detalles');
  const canEdit = hasPermission('clientes', 'editar');
  const canDelete = hasPermission('clientes', 'eliminar');
  
  // Si no tiene ningún permiso de acción, no mostrar el menú
  const hasAnyAction = canViewDetails || canEdit || canDelete;

  const handleDeleteClick = (client: Client) => {
    setClientToDelete(client);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (clientToDelete) {
      onDelete(clientToDelete);
      setClientToDelete(null);
    }
  };

  const renderRun = (run: string | undefined | null) => {
    if (!run || run === '0') {
      return (
        <Badge
          variant='outline'
          className='text-purple-600 border-purple-300 bg-purple-50 text-xs sm:text-sm'
        >
          <User className='h-3 w-3 mr-1' />
          Sin RUN
        </Badge>
      );
    }
    return run;
  };

  const renderPhone = (phone: string | undefined | null | '0') => {
    if (!phone || phone === '0') {
      return (
        <Badge
          variant='outline'
          className='text-purple-600 border-purple-300 bg-purple-50 text-xs sm:text-sm'
        >
          <Phone className='h-3 w-3 mr-1' />
          Sin teléfono
        </Badge>
      );
    }
    return phone;
  };

  const renderDate = (date: string | undefined | null, defaultText: string = 'Sin fecha') => {
    if (!date) {
      return (
        <Badge
          variant='outline'
          className='text-purple-600 border-purple-300 bg-purple-50 text-xs sm:text-sm'
        >
          <Calendar className='h-3 w-3 mr-1' />
          {defaultText}
        </Badge>
      );
    }
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: es });
  };

  // Vista de tarjetas para móviles
  const MobileCardView = () => (
    <div className='lg:hidden space-y-3'>
      {clients.length === 0 ? (
        <Card className='p-6 text-center'>
          <p className='text-gray-500 text-sm sm:text-base'>No hay clientes</p>
        </Card>
      ) : (
        clients.map((client, idx) => (
          <Card key={client.id} className='p-4 sm:p-6'>
            <CardContent className='space-y-3'>
              {/* Header con número y estado */}
              <div className='flex justify-between items-start'>
                <Badge className='bg-purple-100 text-purple-700 rounded-full px-3 py-1 text-xs sm:text-sm'>
                  {(currentPage - 1) * pageSize + idx + 1}
                </Badge>
                {client.status === 1 ? (
                  <Badge className='bg-green-100 text-green-700 rounded-full px-3 py-1 text-xs sm:text-sm'>
                    Activo
                  </Badge>
                ) : (
                  <Badge className='bg-red-200 text-red-600 rounded-full px-3 py-1 text-xs sm:text-sm'>
                    Inactivo
                  </Badge>
                )}
              </div>

              {/* Información del cliente */}
              <div className='space-y-2'>
                <div className='flex items-center gap-2'>
                  <User className='h-4 w-4 text-gray-400' />
                  <span className='font-medium text-sm sm:text-base'>
                    {client.name} {client.lastName}
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  <User className='h-3 w-3 text-gray-400' />
                  <span className='text-xs sm:text-sm text-gray-600'>
                    RUN: {renderRun(client.run)}
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  <Phone className='h-3 w-3 text-gray-400' />
                  <span className='text-xs sm:text-sm text-gray-600'>
                    {renderPhone(client.phone)}
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  <Calendar className='h-3 w-3 text-gray-400' />
                  <span className='text-xs sm:text-sm text-gray-500'>
                    {renderDate(client.updated_at, 'Sin modificar')}
                  </span>
                </div>
              </div>

              {/* Acciones */}
              {hasAnyAction && (
                <div className='flex justify-end pt-2 border-t border-gray-200'>
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
                      {canViewDetails && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuItem
                                onClick={() => onViewDetails(client)}
                                className='cursor-pointer group'
                              >
                                <Eye className='mr-2 text-blue-600 group-hover:text-blue-700 transition-colors w-3 h-3 sm:w-4 sm:h-4' />
                                <span className='group-hover:text-blue-700 transition-colors text-sm sm:text-base'>
                                  Ver detalles
                                </span>
                              </DropdownMenuItem>
                            </TooltipTrigger>
                            <TooltipContent>Ver detalles del cliente</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {canEdit && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuItem
                                onClick={() => onEdit(client)}
                                className='cursor-pointer group'
                              >
                                <Pencil className='mr-2 text-purple-600 group-hover:text-purple-700 transition-colors w-3 h-3 sm:w-4 sm:h-4' />
                                <span className='group-hover:text-purple-700 transition-colors text-sm sm:text-base'>
                                  Editar
                                </span>
                              </DropdownMenuItem>
                            </TooltipTrigger>
                            <TooltipContent>Editar cliente</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {canDelete && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(client)}
                                className='cursor-pointer group'
                              >
                                <Trash className='mr-2 text-red-600 group-hover:text-red-700 transition-colors w-3 h-3 sm:w-4 sm:h-4' />
                                <span className='group-hover:text-red-700 transition-colors text-sm sm:text-base'>
                                  Eliminar
                                </span>
                              </DropdownMenuItem>
                            </TooltipTrigger>
                            <TooltipContent>Eliminar cliente</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  // Vista de tabla para desktop
  const DesktopTableView = () => (
    <div className='hidden lg:block'>
      <div className='rounded-xl border bg-white overflow-hidden shadow-md'>
        <div className='overflow-x-auto'>
          <Table className='min-w-full text-sm bg-white rounded-xl overflow-hidden text-center'>
            <TableHeader className='border-b last:border-b-0 bg-white group'>
              <TableRow>
                <TableHead className='py-3 px-4 text-center text-sm text-gray-400'>#</TableHead>
                <TableHead className='py-3 px-4 text-center text-sm text-gray-400'>RUN</TableHead>
                <TableHead className='py-3 px-4 text-center text-sm text-gray-400'>
                  Nombre
                </TableHead>
                <TableHead className='py-3 px-4 text-center text-sm text-gray-400'>
                  Apellido
                </TableHead>
                <TableHead className='py-3 px-4 text-center text-sm text-gray-400'>
                  Teléfono
                </TableHead>
                <TableHead className='py-3 px-4 text-center text-sm text-gray-400'>
                  Última modificación
                </TableHead>
                <TableHead className='py-3 px-4 text-center text-sm text-gray-400'>
                  Estado
                </TableHead>
                <TableHead className='py-3 px-4 text-center text-sm text-gray-400'>
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 && (
                <TableRow key='empty'>
                  <TableCell colSpan={8} className='text-center py-8 text-gray-400 bg-white'>
                    No hay clientes
                  </TableCell>
                </TableRow>
              )}
              {clients.map((client, idx) => (
                <TableRow
                  key={client.id}
                  className={`border-b bg-white group ${
                    idx === 0 ? 'first:rounded-t-xl' : ''
                  } ${idx === clients.length - 1 ? 'last:rounded-b-xl' : ''}`}
                >
                  <TableCell className='py-3 px-4 text-center text-sm text-gray-600 font-medium'>
                    <Badge className='bg-purple-100 text-purple-700 rounded-full px-3 py-1'>
                      {(currentPage - 1) * pageSize + idx + 1}
                    </Badge>
                  </TableCell>
                  <TableCell className='py-3 px-4 text-center'>{renderRun(client.run)}</TableCell>
                  <TableCell className='py-3 px-4 text-center font-medium'>{client.name}</TableCell>
                  <TableCell className='py-3 px-4 text-center'>{client.lastName}</TableCell>
                  <TableCell className='py-3 px-4 text-center'>
                    {renderPhone(client.phone)}
                  </TableCell>
                  <TableCell className='py-3 px-4 text-center text-sm text-gray-500'>
                    {renderDate(client.updated_at, 'Sin modificar')}
                  </TableCell>
                  <TableCell className='py-3 px-4 text-center'>
                    {client.status === 1 ? (
                      <Badge className='bg-green-100 text-green-700 rounded-full px-3 py-1'>
                        Activo
                      </Badge>
                    ) : (
                      <Badge className='bg-red-200 text-red-600 rounded-full px-3 py-1'>
                        Inactivo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className='py-3 px-4 text-center'>
                    {hasAnyAction && (
                      <div className='flex justify-center'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='bg-white hover:bg-gray-200 rounded-full hover:scale-105 transition-all duration-200'
                            >
                              <MoreVertical />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end' className='w-40'>
                            {canViewDetails && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <DropdownMenuItem
                                      onClick={() => onViewDetails(client)}
                                      className='cursor-pointer group'
                                    >
                                      <Eye className='mr-2 text-blue-600 group-hover:text-blue-700 transition-colors' />
                                      <span className='group-hover:text-blue-700 transition-colors'>
                                        Ver detalles
                                      </span>
                                    </DropdownMenuItem>
                                  </TooltipTrigger>
                                  <TooltipContent>Ver detalles del cliente</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {canEdit && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <DropdownMenuItem
                                      onClick={() => onEdit(client)}
                                      className='cursor-pointer group'
                                    >
                                      <Pencil className='mr-2 text-purple-600 group-hover:text-purple-700 transition-colors' />
                                      <span className='group-hover:text-purple-700 transition-colors'>
                                        Editar
                                      </span>
                                    </DropdownMenuItem>
                                  </TooltipTrigger>
                                  <TooltipContent>Editar cliente</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {canDelete && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteClick(client)}
                                      className='cursor-pointer group'
                                    >
                                      <Trash className='mr-2 text-red-600 group-hover:text-red-700 transition-colors' />
                                      <span className='group-hover:text-red-700 transition-colors'>
                                        Eliminar
                                      </span>
                                    </DropdownMenuItem>
                                  </TooltipTrigger>
                                  <TooltipContent>Eliminar cliente</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <MobileCardView />
      <DesktopTableView />

      <DeleteClientConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        clientName={clientToDelete ? `${clientToDelete.name} ${clientToDelete.lastName}` : ''}
      />
    </TooltipProvider>
  );
}
