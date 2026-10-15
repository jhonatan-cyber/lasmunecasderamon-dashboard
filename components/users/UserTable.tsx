'use client';

/* eslint-disable */
import { useMemo } from 'react';
import { User as UserType } from '@/types/user';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { UserActionMenu } from './UserActionMenu';
import { UserInfoDisplay } from './UserInfoDisplay';
import { UserContactInfo } from './UserContactInfo';
import { UserFinancialInfo } from './UserFinancialInfo';

interface UserTableProps {
  users: UserType[];
  onViewDetails: (user: UserType) => void;
  onEdit: (user: UserType) => void;
  onEnroll: (user: UserType) => void;
  onUnenroll: (user: UserType) => void;
  onActivate: (userId: string | number) => void;
  onDeactivate: (userId: string | number) => void;
  onDelete: (userId: string | number) => void;
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
  onEnroll,
  onUnenroll,
  onActivate,
  onDeactivate,
  onDelete,
  formatDate,
  getRoleBadgeColor,
  currentPage,
  pageSize
}: UserTableProps) {
  const { hasPermission } = useUserPermissions();

  const permissions = useMemo(
    () => ({
      canViewDetails: hasPermission('users', 'view_details'),
      canEdit: hasPermission('users', 'edit'),
      // Enrolar escribe en la ficha biométrica: mismo par que editar.
      canEnroll: hasPermission('users', 'edit'),
      canActivate: hasPermission('users', 'activate'),
      canDeactivate: hasPermission('users', 'deactivate'),
      canDelete: hasPermission('users', 'delete')
    }),
    [hasPermission]
  );

  const hasAnyAction = useMemo(() => Object.values(permissions).some(Boolean), [permissions]);

  if (users.length === 0) {
    return (
      <div className='py-8 text-center text-gray-500 text-sm sm:text-base'>
        No se encontraron usuarios que coincidan con la búsqueda
      </div>
    );
  }

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
              {}
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
                  <UserActionMenu
                    user={user}
                    onViewDetails={onViewDetails}
                    onEdit={onEdit}
                    onEnroll={onEnroll}
                    onUnenroll={onUnenroll}
                    onActivate={onActivate}
                    onDeactivate={onDeactivate}
                    onDelete={onDelete}
                    {...permissions}
                    hasAnyAction={hasAnyAction}
                  />
                </div>
              </div>

              {}
              <UserInfoDisplay
                user={user}
                formatDate={formatDate}
                getRoleBadgeColor={getRoleBadgeColor}
                variant='card'
              />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  const DesktopTableView = () => (
    <div className='hidden lg:block'>
      <div className='bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl border-none shadow-md overflow-hidden'>
        <Table className='min-w-full text-center'>
          <TableHeader className='border-b last:border-b-0 group'>
            <TableRow>
              <TableHead className='sm:px-4 text-start sm:text-sm font-bold'>Usuario</TableHead>
              <TableHead className='sm:px-4 text-start sm:text-sm font-bold'>Información</TableHead>
              <TableHead className='sm:px-4 text-start sm:text-sm font-bold'>Finanzas</TableHead>
              <TableHead className='sm:px-4 text-center sm:text-sm font-bold'>Rol</TableHead>
              <TableHead className='sm:px-4 text-center sm:text-sm font-bold'>Estado</TableHead>
              <TableHead className='sm:px-4 text-center sm:text-sm font-bold'>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className='text-center sm:text-base'>
                  No se encontraron usuarios que coincidan con la búsqueda
                </TableCell>
              </TableRow>
            )}
            {users.map((user, idx) => (
              <TableRow
                key={user.id}
                className={`border-b bg-white group hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors ${
                  idx === 0 ? 'first:rounded-t-xl' : ''
                } ${idx === users.length - 1 ? 'last:rounded-b-xl' : ''}`}
              >
                <TableCell className='sm:px-4 text-start'>
                  <UserInfoDisplay
                    user={user}
                    formatDate={formatDate}
                    getRoleBadgeColor={getRoleBadgeColor}
                    variant='table'
                  />
                </TableCell>

                <TableCell className='sm:px-4 text-start'>
                  <UserContactInfo user={user} />
                </TableCell>

                <TableCell className='sm:px-4 text-center'>
                  <UserFinancialInfo user={user} />
                </TableCell>

                <TableCell className='sm:px-4 text-center'>
                  <Badge className={`${getRoleBadgeColor(user.role)} text-xs sm:text-sm`}>
                    {user.role}
                  </Badge>
                </TableCell>

                <TableCell className='sm:px-4 text-center'>
                  <Badge
                    className={`text-xs sm:text-sm ${
                      user.status === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {user.status === 1 ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>

                <TableCell className='sm:px-4 text-center'>
                  <UserActionMenu
                    user={user}
                    onViewDetails={onViewDetails}
                    onEdit={onEdit}
                    onEnroll={onEnroll}
                    onUnenroll={onUnenroll}
                    onActivate={onActivate}
                    onDeactivate={onDeactivate}
                    onDelete={onDelete}
                    {...permissions}
                    hasAnyAction={hasAnyAction}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <MobileCardView />
      <DesktopTableView />
    </TooltipProvider>
  );
}
