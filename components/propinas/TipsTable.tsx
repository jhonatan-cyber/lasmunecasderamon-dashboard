'use client';

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Eye, Coins } from 'lucide-react';
import Image from 'next/image';
import { formatCurrencyNoDecimals, formatFechaLarga } from '@/lib/utils/formatters';
import { PropinaResumen } from '@/types/propina';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';

interface TipsTableProps {
  loading: boolean;
  rows: PropinaResumen[];
  rowsPerPage: number;
  onVerDetalle: (usuario: PropinaResumen) => void;
}

export default function TipsTable({ loading, rows, rowsPerPage, onVerDetalle }: TipsTableProps) {
  const { hasPermission } = useUserPermissions();
  const canViewDetail = hasPermission('tips', 'view_details');

  const toNumber = (value: unknown) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  if (!loading && rows.length === 0) {
    return (
      <div className='text-center py-8'>
        <div className='flex flex-col items-center space-y-4'>
          <div className='w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center'>
            <Coins className='w-8 h-8 text-gray-400' />
          </div>
          <div>
            <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-2'>
              No hay propinas
            </h3>
            <p className='text-sm text-gray-500'>
              No se encontraron registros de propinas para mostrar
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl border-none shadow-md overflow-hidden'>
      <div className='overflow-x-auto'>
        <Table className='min-w-full text-base text-center'>
          <TableHeader className='bg-gray-100 dark:bg-slate-900/50'>
            <TableRow className='hover:bg-transparent border-gray-100 dark:border-gray-800'>
              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-start'>
                Usuario
              </TableHead>
              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                Total propinas
              </TableHead>
              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                Última propina
              </TableHead>
              <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Estado</TableHead>
              {canViewDetail && (
                <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                  Detalles
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: rowsPerPage }).map((_, i) => (
                  <TableRow key={i} className='border-b border-gray-100 dark:border-gray-800'>
                    <TableCell className='py-4 px-5'>
                      <div className='flex items-center gap-3'>
                        <Skeleton className='h-10 w-10 rounded-full' />
                        <div className='flex flex-col gap-1'>
                          <Skeleton className='h-4 w-36 rounded' />
                          <Skeleton className='h-3 w-20 rounded' />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className='py-4 px-5'>
                      <Skeleton className='h-4 w-24 rounded mx-auto' />
                    </TableCell>
                    <TableCell className='py-4 px-5'>
                      <Skeleton className='h-4 w-28 rounded mx-auto' />
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
              : rows.map((propina, idx) => (
                  <TableRow
                    key={propina.id_usuario}
                    className={`border-b transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/30 border-gray-100 dark:border-gray-800 ${idx === 0 ? 'first:rounded-t-xl' : ''} ${idx === rows.length - 1 ? 'last:rounded-b-xl' : ''}`}
                  >
                    <TableCell className='font-medium text-start text-sm py-4 px-5'>
                      <div className='flex items-center gap-3'>
                        <div className='h-10 w-10 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center'>
                          {propina.usuario_foto && propina.usuario_foto !== '' ? (
                            <Image
                              data-themed-photo
                              src={`/img/users/${propina.usuario_foto}`}
                              alt={propina.nombre_completo || 'Usuario'}
                              width={40}
                              height={40}
                              className='w-full h-full object-cover'
                            />
                          ) : (
                            <span className='text-purple-700 font-bold text-xs'>
                              {(propina.nombre_completo || 'U').substring(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className='font-medium text-gray-900 dark:text-gray-100'>
                            {propina.nombre_completo}
                          </div>
                          <div className='text-xs text-gray-500'>@{propina.nick}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className='text-center text-sm py-4 px-5 font-semibold'>
                      {formatCurrencyNoDecimals(propina.total_propinas)}
                    </TableCell>
                    <TableCell className='text-center text-sm py-4 px-5 text-gray-700 dark:text-gray-300'>
                      {formatFechaLarga(propina.fecha_crea)}
                    </TableCell>
                    <TableCell className='text-center py-4 px-5'>
                      {toNumber(propina.propinas_pendientes) > 0 ? (
                        <Badge className='bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 rounded-full px-3 py-1 text-xs font-semibold'>
                          Pendiente
                        </Badge>
                      ) : toNumber(propina.propinas_cobradas) > 0 ? (
                        <Badge className='bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-full px-3 py-1 text-xs font-semibold'>
                          Pagado
                        </Badge>
                      ) : (
                        <Badge className='bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-full px-3 py-1 text-xs font-semibold'>
                          Sin estado
                        </Badge>
                      )}
                    </TableCell>
                    {canViewDetail && (
                      <TableCell className='text-center py-4 px-5'>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => onVerDetalle(propina)}
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
}
