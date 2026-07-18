'use client';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import React from 'react';
import { Trash, Pencil, MoreVertical, Key } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';

export interface Permission {
  id: number;
  name: string;
  module: string;
  action: string;
  description: string;
  created_at?: string;
  updated_at?: string;
}

interface PermissionTableProps {
  permissions: Permission[];
  loading?: boolean;
  onEdit: (permission: Permission) => void;
  onDelete: (permissionId: string) => void;
  currentPage: number;
  pageSize: number;
}

interface MobileCardViewProps {
  permissions: Permission[];
  currentPage: number;
  pageSize: number;
  onEdit: (permission: Permission) => void;
  handleDeleteClick: (permissionId: string) => void;
  loading?: boolean;
}

const MobileCardView = React.memo(({
  permissions,
  currentPage,
  pageSize,
  onEdit,
  handleDeleteClick,
  loading
}: MobileCardViewProps) => (
  <div className='lg:hidden space-y-4'>
    {loading ? (
      Array.from({ length: pageSize }).map((_, i) => (
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
    ) : (
      permissions.map((permission, idx) => (
        <Card
          key={permission.id}
          className='rounded-3xl border-none shadow-md bg-white dark:bg-slate-900/40 overflow-hidden group hover:shadow-lg hover:-translate-y-0.5 transition-transform duration-200'
        >
          <CardContent className='p-5 space-y-4'>
            <div className='flex justify-between items-start'>
              <div className='space-y-1'>
                <div className='flex items-center justify-between gap-2'>
                  <Badge className='bg-purple-100 text-purple-700 rounded-full px-3 py-1 text-xs sm:text-sm'>
                    {(currentPage - 1) * pageSize + idx + 1}
                  </Badge>
                </div>
                <div className='flex items-center gap-2'>
                  <Key className='h-4 w-4 text-gray-500' />
                  <span className='font-semibold text-sm sm:text-base text-gray-900 dark:text-white'>
                    {permission.name}
                  </span>
                </div>
              </div>
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full p-2'
                      >
                        <MoreVertical className='h-4 w-4' />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Acciones del permiso</p>
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align='end' className='w-44'>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuItem onClick={() => onEdit(permission)}>
                        <Pencil className='mr-2 h-4 w-4 text-purple-600' /> Editar
                      </DropdownMenuItem>
                    </TooltipTrigger>
                    <TooltipContent side='left'><p>Editar permiso</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuItem onClick={() => handleDeleteClick(String(permission.id))}>
                        <Trash className='mr-2 h-4 w-4 text-red-600' /> Eliminar
                      </DropdownMenuItem>
                    </TooltipTrigger>
                    <TooltipContent side='left'><p>Eliminar permiso</p></TooltipContent>
                  </Tooltip>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div className='text-xs text-gray-400 uppercase font-bold'>Módulo</div>
              <div className='text-xs text-gray-500'>
                <Badge variant='outline' className='text-xs rounded-full'>
                  {permission.module.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              <div className='text-xs text-gray-400 uppercase font-bold'>Acción</div>
              <div className='text-xs text-gray-500'>
                <Badge variant='secondary' className='text-xs rounded-full'>
                  {permission.action.toUpperCase()}
                </Badge>
              </div>
              {permission.description && (
                <>
                  <div className='text-xs text-gray-400 uppercase font-bold'>Descripción</div>
                  <div className='text-xs text-gray-500'>{permission.description}</div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))
    )}
  </div>
));

MobileCardView.displayName = 'MobileCardView';

interface DropdownMenuWithTooltipProps {
  permission: Permission;
  onEdit: (permission: Permission) => void;
  handleDeleteClick: (permissionId: string) => void;
}

const DropdownMenuWithTooltip = ({
  permission,
  onEdit,
  handleDeleteClick
}: DropdownMenuWithTooltipProps) => {
  return (
    <div className='flex justify-center'>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='bg-white hover:bg-gray-200 rounded-full hover:scale-105 transition-all duration-200'
              >
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent><p>Acciones</p></TooltipContent>
        </Tooltip>
        <DropdownMenuContent align='end' className='w-44'>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuItem onClick={() => onEdit(permission)}>
                <Pencil className='mr-2 text-purple-600' /> Editar
              </DropdownMenuItem>
            </TooltipTrigger>
            <TooltipContent side='left'><p>Editar permiso</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuItem onClick={() => handleDeleteClick(String(permission.id))}>
                <Trash className='mr-2 text-red-600' /> Eliminar
              </DropdownMenuItem>
            </TooltipTrigger>
            <TooltipContent side='left'><p>Eliminar permiso</p></TooltipContent>
          </Tooltip>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

interface DesktopTableViewProps {
  permissions: Permission[];
  currentPage: number;
  pageSize: number;
  onEdit: (permission: Permission) => void;
  handleDeleteClick: (permissionId: string) => void;
  loading?: boolean;
}

const DesktopTableView = React.memo(({
  permissions,
  currentPage,
  pageSize,
  onEdit,
  handleDeleteClick,
  loading
}: DesktopTableViewProps) => (
  <TooltipProvider>
    <div className='hidden lg:block'>
      <div className='bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl border-none shadow-md overflow-hidden'>
        <Table>
          <TableHeader className='bg-gray-100 dark:bg-slate-900/50'>
            <TableRow className='hover:bg-transparent border-gray-100 dark:border-gray-800'>
              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>#</TableHead>
              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Nombre</TableHead>
              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Módulo</TableHead>
              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Acción</TableHead>
              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Descripción</TableHead>
              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <TableRow key={`loading-${i}`}>
                  <TableCell><Skeleton className='h-4 w-8 mx-auto' /></TableCell>
                  <TableCell><Skeleton className='h-4 w-24 mx-auto' /></TableCell>
                  <TableCell><Skeleton className='h-4 w-20 mx-auto' /></TableCell>
                  <TableCell><Skeleton className='h-4 w-16 mx-auto' /></TableCell>
                  <TableCell><Skeleton className='h-4 w-32 mx-auto' /></TableCell>
                  <TableCell><Skeleton className='h-4 w-16 mx-auto' /></TableCell>
                </TableRow>
              ))
            ) : (
              permissions.map((permission, idx) => (
                <TableRow
                  key={permission.id}
                  className={`border-b transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/30 ${idx === 0 ? 'first:rounded-t-xl' : ''} ${idx === permissions.length - 1 ? 'last:rounded-b-xl' : ''}`}
                >
                  <TableCell className='py-3 px-4 text-center text-sm text-gray-600 font-medium'>
                    <Badge className='bg-purple-100 text-purple-700 rounded-full px-3 py-1'>
                      {(currentPage - 1) * pageSize + idx + 1}
                    </Badge>
                  </TableCell>
                  <TableCell className='py-3 px-4 text-center font-medium'>{permission.name}</TableCell>
                  <TableCell className='py-3 px-4 text-center'>
                    <Badge variant='outline' className='text-xs rounded-full'>
                      {permission.module.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className='py-3 px-4 text-center'>
                    <Badge variant='secondary' className='text-xs rounded-full'>
                      {permission.action.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className='py-3 px-4 text-center text-sm text-gray-500'>
                    {permission.description || '-'}
                  </TableCell>
                  <TableCell className='py-3 px-4 text-center'>
                    <DropdownMenuWithTooltip
                      permission={permission}
                      onEdit={onEdit}
                      handleDeleteClick={handleDeleteClick}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  </TooltipProvider>
));

DesktopTableView.displayName = 'DesktopTableView';

export function PermissionTable({
  permissions,
  loading = false,
  onEdit,
  onDelete,
  currentPage,
  pageSize
}: PermissionTableProps) {

  const handleDeleteClick = (permissionId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este permiso?')) {
      onDelete(permissionId);
    }
  };

  if (!loading && permissions.length === 0) {
    return (
      <Card className='border-none shadow-md rounded-3xl bg-white dark:bg-slate-900/40 overflow-hidden'>
        <CardContent className='flex flex-col items-center justify-center py-12 text-gray-500'>
          <Key className='h-12 w-12 mb-4 opacity-20' />
          <p className='text-lg font-medium'>No hay permisos configurados</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-4'>
      <MobileCardView
        permissions={permissions}
        currentPage={currentPage}
        pageSize={pageSize}
        onEdit={onEdit}
        handleDeleteClick={handleDeleteClick}
        loading={loading}
      />

      <DesktopTableView
        permissions={permissions}
        currentPage={currentPage}
        pageSize={pageSize}
        onEdit={onEdit}
        handleDeleteClick={handleDeleteClick}
        loading={loading}
      />
    </div>
  );
}