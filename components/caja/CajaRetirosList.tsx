'use client';

import { Button } from '@/components/ui/button';
import Paginate from '@/components/shared/Paginate';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDownCircle } from 'lucide-react';
import { formatCurrencyCLP, formatFechaLarga, formatSoloHora } from '@/lib/utils/formatters';

interface CajaRetirosListProps {
  loading: boolean;
  retiros: any[];
  getRows: () => any[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className='space-y-3'>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className='h-20 w-full rounded-xl' />
      ))}
    </div>
  );
}

export function CajaRetirosList({
  loading,
  retiros,
  getRows,
  page,
  totalPages,
  onPageChange
}: CajaRetirosListProps) {
  return (
    <div className='space-y-4'>
      {loading ? (
        <TableSkeleton rows={5} />
      ) : retiros.length === 0 ? (
        <div className='text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-2xl'>
          <ArrowDownCircle className='w-12 h-12 mx-auto mb-3 opacity-30' />
          <p>No hay retiros registrados</p>
        </div>
      ) : (
        <>
          <div className='space-y-3'>
            {getRows().map((retiro: any, idx: number) => (
              <div
                key={idx}
                className='bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between hover:shadow-md transition-shadow'
              >
                <div className='flex items-center gap-4'>
                  <div className='w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center'>
                    <ArrowDownCircle className='w-6 h-6 text-orange-600' />
                  </div>
                  <div>
                    <p className='font-bold text-gray-900 dark:text-white'>
                      {retiro.motivo || 'Sin motivo'}
                    </p>
                    <p className='text-xs text-gray-500'>
                      {formatFechaLarga(retiro.fecha_retiro)} {' '}
                      {formatSoloHora(retiro.fecha_retiro)}
                    </p>
                    <p className='text-xs text-gray-400'>
                      Por: {retiro.cajero_nombre || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className='text-right'>
                  <p className='text-xl font-black text-orange-600'>
                    -{formatCurrencyCLP(retiro.monto)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {retiros.length > 0 && (
            <div className='bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800'>
              <div className='flex justify-between items-center'>
                <span className='font-bold text-orange-800 dark:text-orange-200'>
                  Total Retirado
                </span>
                <span className='text-xl font-black text-orange-700 dark:text-orange-300'>
                  {formatCurrencyCLP(retiros.reduce((sum, r) => sum + r.monto, 0))}
                </span>
              </div>
            </div>
          )}
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
