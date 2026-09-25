'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { Users } from 'lucide-react';

export interface ClienteSaldo {
  id?: string;
  name: string;
  lastName: string;
  run?: string;
  phone?: string;
  saldo: number;
}

interface ClientesSaldoListProps {
  clientes: ClienteSaldo[];
  loading?: boolean;
}

export function ClientesSaldoList({ clientes, loading = false }: ClientesSaldoListProps) {
  if (loading) {
    return (
      <div className='space-y-2'>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className='h-12 w-full rounded-xl' />
        ))}
      </div>
    );
  }

  if (clientes.length === 0) {
    return (
      <div className='text-center py-6 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl'>
        <Users className='w-8 h-8 mx-auto mb-2 opacity-30' />
        <p className='text-sm'>No hay clientes con saldo pendiente</p>
      </div>
    );
  }

  const total = clientes.reduce((sum, c) => sum + Number(c.saldo || 0), 0);

  return (
    <div className='space-y-2'>
      <div className='max-h-64 overflow-y-auto custom-scrollbar space-y-2'>
        {clientes.map((cliente, idx) => (
          <div
            key={cliente.id || idx}
            className='flex items-center justify-between bg-white dark:bg-gray-800 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700'
          >
            <div className='flex items-center gap-3 min-w-0'>
              <div className='w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center shrink-0'>
                <Users className='w-4 h-4 text-amber-600' />
              </div>
              <div className='min-w-0'>
                <p className='text-sm font-bold text-gray-900 dark:text-white truncate'>
                  {cliente.name} {cliente.lastName}
                </p>
                {cliente.run && (
                  <p className='text-xs text-gray-500 dark:text-gray-400'>{cliente.run}</p>
                )}
              </div>
            </div>
            <span className='text-sm font-black text-amber-600 dark:text-amber-400 tabular-nums whitespace-nowrap'>
              {formatCurrencyCLP(cliente.saldo)}
            </span>
          </div>
        ))}
      </div>
      <div className='flex justify-between items-center bg-amber-50 dark:bg-amber-900/20 px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-800'>
        <span className='text-sm font-bold text-amber-800 dark:text-amber-200'>
          Total saldo pendiente ({clientes.length} cliente{clientes.length !== 1 ? 's' : ''})
        </span>
        <span className='text-lg font-black text-amber-700 dark:text-amber-300'>
          {formatCurrencyCLP(total)}
        </span>
      </div>
    </div>
  );
}
