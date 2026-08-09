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
import { Search, ShoppingCart } from 'lucide-react';
import { formatCurrencyNoDecimals, formatSoloHora } from '@/lib/utils/formatters';
import { useConfigValue } from '@/hooks/shared/useConfigValue';

interface CajaVentasTableProps {
  loading: boolean;
  ventas: any[];
  filteredVentas: any[];
  search: string;
  onSearchChange: (value: string) => void;
  getRows: () => any[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRetry: () => void;
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

export function CajaVentasTable({
  loading,
  ventas,
  filteredVentas,
  search,
  onSearchChange,
  getRows,
  page,
  totalPages,
  onPageChange,
  onRetry
}: CajaVentasTableProps) {
  const propinaPct = Number(useConfigValue('facturacion', 'propina_venta', '10'));
  return (
    <div className='space-y-4'>
      <div className='relative print:hidden'>
        <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
        <Input
          placeholder='Buscar por cliente, habitacion o categoria...'
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className='pl-10 rounded-xl'
        />
      </div>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : filteredVentas.length === 0 ? (
        <div className='text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-2xl'>
          <ShoppingCart className='w-12 h-12 mx-auto mb-3 opacity-30' />
          <p className='font-medium mb-2'>
            {ventas.length === 0
              ? 'No hay ventas registradas en esta caja'
              : 'No hay ventas que coincidan con la busqueda'}
          </p>
          {ventas.length === 0 && (
            <Button variant='outline' size='sm' onClick={onRetry} className='rounded-full text-xs'>
              Reintentar carga
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className='bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow className='bg-gray-50 dark:bg-gray-800/50'>
                    <TableHead className='font-bold text-xs'>CLIENTE</TableHead>
                    <TableHead className='font-bold text-xs'>HAB.</TableHead>
                    <TableHead className='font-bold text-xs'>CAT.</TableHead>
                    <TableHead className='font-bold text-xs text-right'>CANT.</TableHead>
                    <TableHead className='font-bold text-xs text-right'>PRECIO</TableHead>
                    <TableHead className='font-bold text-xs text-right'>
                      PROPINA ({propinaPct}%)
                    </TableHead>
                    <TableHead className='font-bold text-xs'>HORA</TableHead>
                    <TableHead className='font-bold text-xs'>METODO</TableHead>
                    <TableHead className='font-bold text-xs text-right'>TOTAL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getRows().map((venta: any, idx: number) => (
                    <TableRow key={idx} className='hover:bg-gray-50 dark:hover:bg-gray-800/50'>
                      <TableCell className='font-medium text-sm'>
                        {venta.cliente_nombre || 'General'}
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline' className='text-xs'>
                          {venta.habitacion_nombre ||
                            (venta.habitacion_id ? 'Habitacion' : 'Barra')}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-sm capitalize text-gray-600'>
                        {venta.item_count || 0} items
                      </TableCell>
                      <TableCell className='text-right font-bold'>
                        {venta.item_count || 0}
                      </TableCell>
                      <TableCell className='text-right text-sm text-gray-600'>
                        {formatCurrencyNoDecimals(venta.sub_total)}
                      </TableCell>
                      <TableCell className='text-right text-sm text-amber-600'>
                        {formatCurrencyNoDecimals(venta.propina)}
                      </TableCell>
                      <TableCell className='text-sm text-gray-500'>
                        {formatSoloHora(venta.fecha_crea)}
                      </TableCell>
                      <TableCell>
                        <Badge variant='secondary' className='text-xs capitalize'>
                          {venta.metodo_pago || 'efectivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-right font-black'>
                        {formatCurrencyNoDecimals(venta.total)}
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
