'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Paginate from '@/components/shared/Paginate';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table';
import { Search, Home } from 'lucide-react';
import { formatCurrencyNoDecimals, formatFechaLarga } from '@/lib/utils/formatters';

interface CajaServiciosTableProps {
  loading: boolean;
  servicios: any[];
  filteredServicios: any[];
  search: string;
  onSearchChange: (value: string) => void;
  getRows: () => any[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className='space-y-3'>
      <Skeleton className='h-8 w-full' />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className='h-12 w-full' />
      ))}
    </div>
  );
}

export function CajaServiciosTable({
  loading,
  servicios,
  filteredServicios,
  search,
  onSearchChange,
  getRows,
  page,
  totalPages,
  onPageChange
}: CajaServiciosTableProps) {
  return (
    <div className='space-y-4'>
      <div className='relative print:hidden'>
        <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
        <Input
          placeholder='Buscar por cliente, anfitriona o habitacion...'
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className='pl-10 rounded-xl'
        />
      </div>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : filteredServicios.length === 0 ? (
        <div className='text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-2xl'>
          <Home className='w-12 h-12 mx-auto mb-3 opacity-30' />
          <p>No hay servicios registrados</p>
        </div>
      ) : (
        <>
          <div className='bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow className='bg-gray-50 dark:bg-gray-800/50'>
                    <TableHead className='font-bold text-xs'>CLIENTE</TableHead>
                    <TableHead className='font-bold text-xs'>ANFITRIONAS</TableHead>
                    <TableHead className='font-bold text-xs'>HAB.</TableHead>
                    <TableHead className='font-bold text-xs text-right'>SERVICIO</TableHead>
                    <TableHead className='font-bold text-xs text-right'>HABITACION</TableHead>
                    <TableHead className='font-bold text-xs text-right'>IVA</TableHead>
                    <TableHead className='font-bold text-xs'>FECHA</TableHead>
                    <TableHead className='font-bold text-xs'>PAGO</TableHead>
                    <TableHead className='font-bold text-xs text-right'>TOTAL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getRows().map((servicio: any, idx: number) => (
                    <TableRow key={idx} className='hover:bg-gray-50 dark:hover:bg-gray-800/50'>
                      <TableCell className='font-medium text-sm'>
                        {servicio.cliente_nombre || 'N/A'}
                      </TableCell>
                      <TableCell className='text-sm text-gray-600 italic'>
                        {servicio.anfitrionas_nombres || 'Sin asignar'}
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline' className='text-xs'>
                          {servicio.habitacion_nombre || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-right text-sm font-semibold text-emerald-600'>
                        {formatCurrencyNoDecimals(servicio.precio_servicio || 0)}
                      </TableCell>
                      <TableCell className='text-right text-sm font-semibold text-blue-600'>
                        {formatCurrencyNoDecimals(servicio.precio_habitacion || 0)}
                      </TableCell>
                      <TableCell className='text-right text-sm font-semibold text-purple-600'>
                        {formatCurrencyNoDecimals(servicio.iva || 0)}
                      </TableCell>
                      <TableCell className='text-sm text-gray-500'>
                        {formatFechaLarga(servicio.fecha_crea)}
                      </TableCell>
                      <TableCell>
                        <Badge variant='secondary' className='text-xs capitalize'>
                          {servicio.metodo_pago || 'efectivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-right font-black'>
                        {formatCurrencyNoDecimals(servicio.total || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          {totalPages > 1 && (
            <div className='print:hidden'>
              <Paginate page={page} totalPages={totalPages} setPage={onPageChange} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
