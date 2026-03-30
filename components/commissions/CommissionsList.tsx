/* eslint-disable */
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
        <div className='flex flex-col items-center space-y-4'>
          <div className='w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center'>
            <DollarSign className='w-8 h-8 text-gray-400' />
          </div>
          <div>
            <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-2'>
              No se encontraron comisiones
            </h3>
            <p className='text-sm text-gray-500'>Intenta ajustar los filtros de búsqueda</p>
          </div>
        </div>
      </div>
    );
  }

  // Vista de tarjetas para móviles
  const MobileCardView = () => (
    <div className='lg:hidden space-y-3'>
      {loading
        ? Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className='bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl shadow-md p-4 space-y-3'
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
              className='bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl shadow-md border-none p-4 space-y-3'
            >
              {/* Header con empleado y estado */}
              <div className='flex justify-between items-start'>
                <div className='flex items-center gap-2'>
                  <User className='h-4 w-4 text-blue-500' />
                  <span className='font-bold text-sm'>{commission.nick}</span>
                </div>
                <Badge className={`${getStatusColor(commission.status)} text-xs rounded-full px-2 py-1`}>
                  {statusLabel(commission.status)}
                </Badge>
              </div>

              {/* Información */}
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

  // Vista de tabla para desktop
  const DesktopTableView = () => (
    <div className='hidden lg:block bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl border-none shadow-md overflow-hidden'>
      <div className='overflow-x-auto'>
        <Table className='min-w-full text-base text-center'>
          <TableHeader className='bg-gray-100 dark:bg-slate-900/50'>
            <TableRow className='hover:bg-transparent border-gray-100 dark:border-gray-800'>
              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-start'>
                Nick / Anfitriona
              </TableHead>
              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Venta</TableHead>
              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Servicio</TableHead>
              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Total</TableHead>
              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Estado</TableHead>
              {canViewDetail && (
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                  Acciones
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }, (_, i) => (
                  <TableRow key={i} className='border-b border-gray-100 dark:border-gray-800'>
                    <TableCell className='py-4 px-5'>
                      <div className='flex flex-col gap-1 items-start'>
                        <Skeleton className='h-4 w-24 rounded' />
                        <Skeleton className='h-3 w-36 rounded' />
                      </div>
                    </TableCell>
                    <TableCell className='py-4 px-5'>
                      <Skeleton className='h-4 w-20 rounded mx-auto' />
                    </TableCell>
                    <TableCell className='py-4 px-5'>
                      <Skeleton className='h-4 w-20 rounded mx-auto' />
                    </TableCell>
                    <TableCell className='py-4 px-5'>
                      <Skeleton className='h-4 w-20 rounded mx-auto' />
                    </TableCell>
                    <TableCell className='py-4 px-5'>
                      <Skeleton className='h-6 w-20 rounded-full mx-auto' />
                    </TableCell>
                    {canViewDetail && (
                      <TableCell className='py-4 px-5'>
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
                    <TableCell className='font-medium text-start text-sm py-4 px-5'>
                      <div className='font-bold text-blue-600'>{commission.nick}</div>
                      <div className='text-xs text-gray-400'>{commission.employeeName}</div>
                    </TableCell>
                    <TableCell className='text-center text-sm py-4 px-5 font-semibold'>
                      {formatCurrencyNoDecimals(commission.venta)}
                    </TableCell>
                    <TableCell className='text-center text-sm py-4 px-5 font-semibold'>
                      {formatCurrencyNoDecimals(commission.servicio)}
                    </TableCell>
                    <TableCell className='text-center text-sm py-4 px-5 font-bold'>
                      {formatCurrencyNoDecimals(commission.total)}
                    </TableCell>
                    <TableCell className='text-center py-4 px-5'>
                      <Badge
                        className={`${getStatusColor(commission.status)} text-xs rounded-full px-2 py-1 font-medium`}
                      >
                        {statusLabel(commission.status)}
                      </Badge>
                    </TableCell>
                    {canViewDetail && (
                      <TableCell className='text-center py-4 px-5'>
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
