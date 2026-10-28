/* eslint-disable */
'use client';

import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { Commission } from '@/types/commission';
import { DollarSign, User, Tag, ShoppingCart, Server, Coins, Eye } from 'lucide-react';
import Paginate from '@/components/shared/Paginate';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import Image from 'next/image';

interface CommissionsListProps {
  loading: boolean;
  paginatedCommissions: Commission[];
  getStatusColor: (status: string) => string;
  page: number;
  setPage: (value: number) => void;
  totalPages: number;
  onViewDetails: (commission: Commission) => void;
}

export function CommissionsList({
  loading,
  paginatedCommissions,
  getStatusColor,
  page,
  setPage,
  totalPages,
  onViewDetails
}: CommissionsListProps) {
  const { hasPermission } = useUserPermissions();
  const canViewDetail = hasPermission('commissions', 'view_details');

  const statusLabel = (status: string) => {
    if (status === 'por_pagar') return 'Por pagar';
    if (status === 'pagado') return 'Pagado';
    return 'Anulado';
  };

  if (!loading && paginatedCommissions.length === 0) {
    return (
      <div className='text-center py-8'>
        <EmptyState
          icon={DollarSign}
          title='No se encontraron comisiones'
          description='Intenta ajustar los filtros de búsqueda'
        />
      </div>
    );
  }

  const MobileCardView = () => (
    <div className='lg:hidden space-y-3'>
      {loading
        ? Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className='bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl shadow-md p-4 space-y-3'
            >
              <div className='flex justify-between items-start'>
                <Skeleton className='h-4 w-28 rounded' />
                <Skeleton className='h-6 w-20 rounded-full' />
              </div>
              <Skeleton className='h-3 w-36 rounded' />
              <div className='space-y-2'>
                <Skeleton className='h-3 w-32 rounded' />
                <Skeleton className='h-3 w-32 rounded' />
                <Skeleton className='h-3 w-24 rounded' />
              </div>
            </div>
          ))
        : paginatedCommissions.map(commission => (
            <div
              key={commission.id}
              className='bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl shadow-md border-none p-4 space-y-3'
            >
              {}
              <div className='flex justify-between items-start'>
                <div className='flex items-center gap-2'>
                  <Avatar className='h-8 w-8'>
                    {commission.empleado_foto && commission.empleado_foto !== '' ? (
                      <Image
                        data-themed-photo
                        src={`/img/users/${commission.empleado_foto}?v=${commission.image_version || ''}`}
                        alt={commission.employeeName || 'Usuario'}
                        width={32}
                        height={32}
                        className='w-full h-full object-cover rounded-full'
                      />
                    ) : (
                      <AvatarFallback className='bg-blue-100 text-blue-700 font-bold text-xs'>
                        {commission.nick?.substring(0, 2).toUpperCase() || 'NA'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span className='font-bold text-sm'>{commission.nick}</span>
                </div>
                <Badge
                  className={`${getStatusColor(commission.status)} text-xs rounded-full px-2 py-1`}
                >
                  {statusLabel(commission.status)}
                </Badge>
              </div>

              {}
              <div className='space-y-2'>
                <div className='flex items-center gap-2'>
                  <Tag className='h-3 w-3 text-gray-400' />
                  <span className='text-xs text-gray-600 dark:text-gray-400'>
                    {commission.employeeName}
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <ShoppingCart className='h-3 w-3 text-gray-400' />
                  <span className='text-xs text-gray-600 dark:text-gray-400'>
                    Venta: {formatCurrencyNoDecimals(commission.venta)}
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <Server className='h-3 w-3 text-gray-400' />
                  <span className='text-xs text-gray-600 dark:text-gray-400'>
                    Servicio: {formatCurrencyNoDecimals(commission.servicio)}
                  </span>
                </div>
                <div className='flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800'>
                  <Coins className='h-3 w-3 text-green-500' />
                  <span className='text-sm font-semibold text-green-600'>
                    Total: {formatCurrencyNoDecimals(commission.total)}
                  </span>
                </div>
              </div>

              {canViewDetail && (
                <div className='pt-3 border-t border-gray-100 dark:border-gray-800'>
                  <Button
                    onClick={() => onViewDetails(commission)}
                    size='sm'
                    variant='ghost'
                    className='w-full h-8 rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors duration-200 text-xs'
                  >
                    <Eye className='h-3 w-3 mr-2' />
                    Ver detalle
                  </Button>
                </div>
              )}
            </div>
          ))}
    </div>
  );

  const DesktopTableView = () => (
    <div className='hidden lg:block bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl border-none shadow-md overflow-hidden'>
      <div className='overflow-x-auto'>
        <Table className='min-w-full text-center'>
          <TableHeader>
            <TableRow className='hover:bg-transparent'>
              <TableHead className='text-start'>Nick / Anfitriona</TableHead>
              <TableHead>Venta</TableHead>
              <TableHead>Servicio</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
              {canViewDetail && <TableHead>Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }, (_, i) => (
                  <TableRow key={i} className='border-b'>
                    <TableCell>
                      <div className='flex flex-col gap-1 items-start'>
                        <Skeleton className='h-4 w-24 rounded' />
                        <Skeleton className='h-3 w-36 rounded' />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-4 w-20 rounded mx-auto' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-4 w-20 rounded mx-auto' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-4 w-20 rounded mx-auto' />
                    </TableCell>
                    <TableCell>
                      <Skeleton className='h-6 w-20 rounded-full mx-auto' />
                    </TableCell>
                    {canViewDetail && (
                      <TableCell>
                        <Skeleton className='h-8 w-8 rounded-xl mx-auto' />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              : paginatedCommissions.map((commission, idx) => (
                  <TableRow
                    key={commission.id}
                    className={`border-b transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/30 border-gray-100 dark:border-gray-800 ${idx === 0 ? 'first:rounded-t-xl' : ''} ${idx === paginatedCommissions.length - 1 ? 'last:rounded-b-xl' : ''}`}
                  >
                    <TableCell className='font-medium text-start'>
                      <div className='flex items-center gap-3'>
                        <Avatar className='h-8 w-8'>
                          {commission.empleado_foto && commission.empleado_foto !== '' ? (
                            <Image
                              data-themed-photo
                              src={`/img/users/${commission.empleado_foto}`}
                              alt={commission.employeeName || 'Usuario'}
                              width={32}
                              height={32}
                              className='w-full h-full object-cover rounded-full'
                            />
                          ) : (
                            <AvatarFallback className='bg-blue-100 text-blue-700 font-bold text-xs'>
                              {commission.nick?.substring(0, 2).toUpperCase() || 'NA'}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <div className='font-bold text-blue-600'>{commission.nick}</div>
                          <div className='text-xs text-gray-400'>{commission.employeeName}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className='text-center font-semibold'>
                      {formatCurrencyNoDecimals(commission.venta)}
                    </TableCell>
                    <TableCell className='text-center font-semibold'>
                      {formatCurrencyNoDecimals(commission.servicio)}
                    </TableCell>
                    <TableCell className='text-center font-bold'>
                      {formatCurrencyNoDecimals(commission.total)}
                    </TableCell>
                    <TableCell className='text-center'>
                      <Badge
                        className={`${getStatusColor(commission.status)} text-xs rounded-full px-2 py-1 font-medium`}
                      >
                        {statusLabel(commission.status)}
                      </Badge>
                    </TableCell>
                    {canViewDetail && (
                      <TableCell className='text-center'>
                        <Button
                          onClick={() => onViewDetails(commission)}
                          size='sm'
                          variant='ghost'
                          className='h-8 w-8 p-0 rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors duration-200'
                        >
                          <Eye className='w-4 h-4' />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <>
      <MobileCardView />
      <DesktopTableView />

      {totalPages > 1 && (
        <div className='flex justify-center mt-4 sm:mt-6'>
          <Paginate page={page} totalPages={totalPages} setPage={setPage} />
        </div>
      )}
    </>
  );
}
