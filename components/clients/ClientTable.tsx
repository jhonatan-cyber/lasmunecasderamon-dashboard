'use client';

import { Client } from '@/types/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import React from 'react';
import {
  Trash,
  Pencil,
  Eye,
  Phone,
  User,
  MoreVertical,
  Wallet,
  ArrowDownCircle
} from 'lucide-react';
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
import { DeleteConfirmModal } from '@/components/shared/DeleteConfirmModal';
import { Card, CardContent } from '@/components/ui/card';
import { useClientTable } from '@/hooks/clientes/useClientTable';

interface ClientTableProps {
  clients: Client[];
  loading?: boolean;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onViewDetails: (client: Client) => void;
  onLoadPrepago: (client: Client) => void;
  onDevolucion?: (client: Client) => void;
  currentPage: number;
  pageSize: number;
  isMutating?: boolean;
}

interface MobileCardViewProps {
  clients: Client[];
  currentPage: number;
  pageSize: number;
  hasAnyAction: boolean;
  canViewDetails: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onViewDetails: (client: Client) => void;
  onEdit: (client: Client) => void;
  onLoadPrepago: (client: Client) => void;
  onDevolucion?: (client: Client) => void;
  handleDeleteClick: (client: Client) => void;
  renderRun: (run: string | undefined | null) => React.ReactNode;
  renderPhone: (phone: string | undefined | null | '0') => React.ReactNode;
  loading?: boolean;
}

const MobileCardView = React.memo(
  ({
    clients,
    currentPage,
    pageSize,
    hasAnyAction,
    canViewDetails,
    canEdit,
    canDelete,
    onViewDetails,
    onEdit,
    onLoadPrepago,
    onDevolucion,
    handleDeleteClick,
    renderRun,
    renderPhone,
    loading
  }: MobileCardViewProps) => (
    <div className='lg:hidden space-y-4'>
      {loading
        ? Array.from({ length: pageSize }).map((_, i) => (
            <Card
              key={i}
              className='rounded-3xl border-none shadow-md bg-white dark:bg-slate-900/40 overflow-hidden animate-pulse'
            >
              <CardContent className='p-4'>
                <Skeleton className='h-6 w-1/2 mb-4' />
                <Skeleton className='h-4 w-full mb-2' />
                <Skeleton className='h-4 w-3/4 mb-2' />
                <Skeleton className='h-4 w-1/2' />
              </CardContent>
            </Card>
          ))
        : clients.map((client, idx) => (
            <Card
              key={client.id}
              className='rounded-3xl border-none shadow-md bg-white dark:bg-slate-900/40 overflow-hidden group hover:shadow-lg hover:-translate-y-0.5 transition-transform duration-200'
            >
              <CardContent className='p-5 space-y-4'>
                <div className='flex justify-between items-start'>
                  <div className='space-y-1'>
                    <div className='flex items-center justify-between gap-2'>
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
                    <div className='flex items-center gap-2'>
                      <User className='h-4 w-4 text-gray-500' />
                      <span className='font-semibold text-sm sm:text-base text-gray-900 dark:text-white'>
                        {client.name} {client.lastName}
                      </span>
                    </div>
                  </div>
                  {hasAnyAction && (
                    <ClientActionsDropdown
                      client={client}
                      canViewDetails={canViewDetails}
                      canEdit={canEdit}
                      canDelete={canDelete}
                      onViewDetails={onViewDetails}
                      onEdit={onEdit}
                      onLoadPrepago={onLoadPrepago}
                      onDevolucion={onDevolucion}
                      handleDeleteClick={handleDeleteClick}
                    />
                  )}
                </div>

                <div className='grid grid-cols-2 gap-3'>
                  <div className='text-xs text-gray-400 uppercase font-bold text-center'>RUT</div>
                  <div className='text-xs text-gray-500 text-center'>{renderRun(client.run)}</div>
                  <div className='text-xs text-gray-400 uppercase font-bold text-center'>
                    TELÉFONO
                  </div>
                  <div className='text-xs text-gray-500 text-center'>
                    {renderPhone(client.phone)}
                  </div>
                  <div className='text-xs text-gray-400 uppercase font-bold text-center'>SALDO</div>
                  <div className='text-xs font-bold text-green-600 text-center'>
                    ${(client.saldo || 0).toLocaleString('es-CL')}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
    </div>
  )
);

MobileCardView.displayName = 'MobileCardView';

interface ClientActionsDropdownProps {
  client: Client;
  canViewDetails: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onViewDetails: (client: Client) => void;
  onEdit: (client: Client) => void;
  onLoadPrepago: (client: Client) => void;
  onDevolucion?: (client: Client) => void;
  handleDeleteClick: (client: Client) => void;
}

const ClientActionsDropdown = ({
  client,
  canViewDetails,
  canEdit,
  canDelete,
  onViewDetails,
  onEdit,
  onLoadPrepago,
  onDevolucion,
  handleDeleteClick
}: ClientActionsDropdownProps) => {
  return (
    <div className='flex justify-center'>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                aria-label='Más acciones'
                className='bg-white hover:bg-gray-200 rounded-full hover:scale-105 transition-all duration-200'
              >
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Acciones</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align='end' className='w-44'>
          {canViewDetails && (
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuItem onClick={() => onViewDetails(client)}>
                  <Eye className='mr-2 text-blue-600' /> Ver detalles
                </DropdownMenuItem>
              </TooltipTrigger>
              <TooltipContent side='left'>
                <p>Ver información completa del cliente</p>
              </TooltipContent>
            </Tooltip>
          )}
          {canEdit && (
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuItem onClick={() => onEdit(client)}>
                  <Pencil className='mr-2 text-purple-600' /> Editar
                </DropdownMenuItem>
              </TooltipTrigger>
              <TooltipContent side='left'>
                <p>Editar datos del cliente</p>
              </TooltipContent>
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuItem onClick={() => handleDeleteClick(client)}>
                  <Trash className='mr-2 text-red-600' /> Eliminar
                </DropdownMenuItem>
              </TooltipTrigger>
              <TooltipContent side='left'>
                <p>Eliminar cliente</p>
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuItem onClick={() => onLoadPrepago(client)}>
                <Wallet className='mr-2 text-green-600' /> Cargar saldo
              </DropdownMenuItem>
            </TooltipTrigger>
            <TooltipContent side='left'>
              <p>Cargar saldo prepago</p>
            </TooltipContent>
          </Tooltip>
          {onDevolucion && Number(client.saldo || 0) > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuItem onClick={() => onDevolucion(client)}>
                  <ArrowDownCircle className='mr-2 text-red-600' /> Devolver saldo
                </DropdownMenuItem>
              </TooltipTrigger>
              <TooltipContent side='left'>
                <p>Devolver saldo al cliente</p>
              </TooltipContent>
            </Tooltip>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

interface DesktopTableViewProps {
  clients: Client[];
  currentPage: number;
  pageSize: number;
  hasAnyAction: boolean;
  canViewDetails: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onViewDetails: (client: Client) => void;
  onEdit: (client: Client) => void;
  onLoadPrepago: (client: Client) => void;
  onDevolucion?: (client: Client) => void;
  handleDeleteClick: (client: Client) => void;
  renderRun: (run: string | undefined | null) => React.ReactNode;
  renderPhone: (phone: string | undefined | null | '0') => React.ReactNode;
  loading?: boolean;
}

const DesktopTableView = React.memo(
  ({
    clients,
    currentPage,
    pageSize,
    hasAnyAction,
    canViewDetails,
    canEdit,
    canDelete,
    onViewDetails,
    onEdit,
    onLoadPrepago,
    onDevolucion,
    handleDeleteClick,
    renderRun,
    renderPhone,
    loading
  }: DesktopTableViewProps) => (
    <TooltipProvider>
      <div className='hidden lg:block'>
        <div className='bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl border-none shadow-md overflow-hidden'>
          <Table>
            <TableHeader className='bg-gray-100 dark:bg-slate-900/50'>
              <TableRow className='hover:bg-transparent border-gray-100 dark:border-gray-800'>
                <TableHead className='py-4 px-5 text-xs uppercase font-bold text-gray-500 dark:text-gray-400 text-center'>
                  #
                </TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase font-bold text-gray-500 dark:text-gray-400 text-center'>
                  RUT
                </TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase font-bold text-gray-500 dark:text-gray-400 text-center'>
                  Nombre
                </TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase font-bold text-gray-500 dark:text-gray-400 text-center'>
                  Apellido
                </TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase font-bold text-gray-500 dark:text-gray-400 text-center'>
                  Teléfono
                </TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase font-bold text-gray-500 dark:text-gray-400 text-center'>
                  Estado
                </TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase font-bold text-gray-500 dark:text-gray-400 text-center'>
                  Saldo Prepago
                </TableHead>
                <TableHead className='py-4 px-5 text-xs uppercase font-bold text-gray-500 dark:text-gray-400 text-center'>
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: pageSize }).map((_, i) => (
                    <TableRow key={`loading-${i}`}>
                      <TableCell className='text-center'>
                        <Skeleton className='h-4 w-8 mx-auto' />
                      </TableCell>
                      <TableCell className='text-center'>
                        <Skeleton className='h-4 w-16 mx-auto' />
                      </TableCell>
                      <TableCell className='text-center'>
                        <Skeleton className='h-4 w-20 mx-auto' />
                      </TableCell>
                      <TableCell className='text-center'>
                        <Skeleton className='h-4 w-20 mx-auto' />
                      </TableCell>
                      <TableCell className='text-center'>
                        <Skeleton className='h-4 w-24 mx-auto' />
                      </TableCell>
                      <TableCell className='text-center'>
                        <Skeleton className='h-4 w-16 mx-auto' />
                      </TableCell>
                      <TableCell className='text-center'>
                        <Skeleton className='h-4 w-14 mx-auto' />
                      </TableCell>
                      <TableCell className='text-center'>
                        <Skeleton className='h-4 w-16 mx-auto' />
                      </TableCell>
                    </TableRow>
                  ))
                : clients.map((client, idx) => (
                    <TableRow
                      key={client.id}
                      className={`border-b transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/30 ${idx === 0 ? 'first:rounded-t-xl' : ''} ${idx === clients.length - 1 ? 'last:rounded-b-xl' : ''}`}
                    >
                      <TableCell className='py-3 px-4 text-center text-sm text-gray-600 font-medium'>
                        <Badge className='bg-purple-100 text-purple-700 rounded-full px-3 py-1'>
                          {(currentPage - 1) * pageSize + idx + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className='py-3 px-4 text-center'>
                        {renderRun(client.run)}
                      </TableCell>
                      <TableCell className='py-3 px-4 text-center font-medium'>
                        {client.name}
                      </TableCell>
                      <TableCell className='py-3 px-4 text-center'>{client.lastName}</TableCell>
                      <TableCell className='py-3 px-4 text-center'>
                        {renderPhone(client.phone)}
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
                      <TableCell className='py-3 px-4 text-center font-bold text-green-600'>
                        ${(client.saldo || 0).toLocaleString('es-CL')}
                      </TableCell>
                      <TableCell className='py-3 px-4 text-center'>
                        {hasAnyAction && (
                          <ClientActionsDropdown
                            client={client}
                            canViewDetails={canViewDetails}
                            canEdit={canEdit}
                            canDelete={canDelete}
                            onViewDetails={onViewDetails}
                            onEdit={onEdit}
                            onLoadPrepago={onLoadPrepago}
                            onDevolucion={onDevolucion}
                            handleDeleteClick={handleDeleteClick}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  )
);

DesktopTableView.displayName = 'DesktopTableView';

export function ClientTable({
  clients,
  loading = false,
  onEdit,
  onDelete,
  onViewDetails,
  onLoadPrepago,
  onDevolucion,
  currentPage,
  pageSize,
  isMutating = false
}: ClientTableProps) {
  const {
    deleteModalOpen,
    clientToDelete,
    canViewDetails,
    canEdit,
    canDelete,
    hasAnyAction,
    handleDeleteClick,
    handleConfirmDelete,
    renderRun,
    renderPhone,
    setDeleteModalOpen
  } = useClientTable();

  if (!loading && clients.length === 0) {
    return (
      <Card className='border-none shadow-md rounded-3xl bg-white dark:bg-slate-900/40 overflow-hidden'>
        <CardContent className='flex flex-col items-center justify-center py-12 text-gray-500'>
          <User className='h-12 w-12 mb-4 opacity-20' />
          <p className='text-lg font-medium'>No hay clientes registrados</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-4'>
      <MobileCardView
        clients={clients}
        currentPage={currentPage}
        pageSize={pageSize}
        hasAnyAction={hasAnyAction}
        canViewDetails={canViewDetails}
        canEdit={canEdit}
        canDelete={canDelete}
        onViewDetails={onViewDetails}
        onEdit={onEdit}
        onLoadPrepago={onLoadPrepago}
        onDevolucion={onDevolucion}
        handleDeleteClick={handleDeleteClick}
        renderRun={renderRun}
        renderPhone={renderPhone}
        loading={loading || isMutating}
      />

      <DesktopTableView
        clients={clients}
        currentPage={currentPage}
        pageSize={pageSize}
        hasAnyAction={hasAnyAction}
        canViewDetails={canViewDetails}
        canEdit={canEdit}
        canDelete={canDelete}
        onViewDetails={onViewDetails}
        onEdit={onEdit}
        onLoadPrepago={onLoadPrepago}
        onDevolucion={onDevolucion}
        handleDeleteClick={handleDeleteClick}
        renderRun={renderRun}
        renderPhone={renderPhone}
        loading={loading || isMutating}
      />

      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={() => {
          const client = handleConfirmDelete();
          if (client) onDelete(client);
        }}
        entityLabel='cliente'
        entityValue={clientToDelete ? `${clientToDelete.name} ${clientToDelete.lastName}` : '---'}
        fieldName='Cliente'
      />
    </div>
  );
}
