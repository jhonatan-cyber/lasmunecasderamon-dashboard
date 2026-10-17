'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useGenericFetch } from '@/hooks/shared/useGenericFetch';
import type { OrdenReposicion } from '@/modules/inventario/reposicion/servicio';
import { PURCHASE_BUTTON_CLASS } from '@/components/purchases/buttonStyles';

export function ReplenishmentNotice({
  showProducts = false,
  compact = false
}: {
  showProducts?: boolean;
  compact?: boolean;
}) {
  const { data, error, isLoading } = useGenericFetch<OrdenReposicion>(
    '/api/purchases/replenishment',
    {
      transform: result => (result.success ? result.data : [])
    }
  );
  if (compact)
    return (
      <div className='flex flex-col items-start gap-1'>
        <Button asChild className={`${PURCHASE_BUTTON_CLASS} shrink-0`}>
          <Link href='/purchases/replenishment'>
            Órdenes de compra
            <span className='inline-flex min-w-6 h-6 items-center justify-center rounded-full bg-white/20 px-1.5 text-xs tabular-nums'>
              {isLoading ? '…' : error ? '—' : data.length}
            </span>
          </Link>
        </Button>
        {error && (
          <p role='alert' className='text-xs text-red-600 dark:text-red-400'>
            No se pudo consultar las órdenes.
          </p>
        )}
      </div>
    );

  return (
    <div
      className={`rounded-xl border p-4 ${data.length ? 'border-amber-400 bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-100' : ''}`}
    >
      {showProducts && <h2 className='text-lg font-semibold mb-2'>Productos con stock bajo</h2>}
      {data.length > 0 && (
        <p className='font-semibold'>
          Stock bajo: {data.length} presentación(es) necesitan compra.
        </p>
      )}
      {error && <p role='alert'>No se pudo comprobar el stock mínimo.</p>}
      {showProducts &&
        (isLoading ? (
          <p role='status'>Comprobando stock…</p>
        ) : error ? null : data.length ? (
          <ul
            className='my-4 max-h-80 overflow-y-auto divide-y divide-current/15'
            aria-label='Productos con stock bajo'
          >
            {data.map(row => (
              <li key={row.id} className='flex flex-wrap justify-between gap-2 py-3'>
                <div>
                  <p className='font-semibold'>
                    {row.producto} · {row.presentacion}
                  </p>
                  <p className='text-sm'>
                    Stock total: {row.stock_actual.toLocaleString('es-CL')} (Bar + Bodega) · Mínimo:{' '}
                    {row.stock_minimo.toLocaleString('es-CL')} · Máximo:{' '}
                    {row.stock_maximo.toLocaleString('es-CL')}
                  </p>
                </div>
                <p className='font-semibold'>Comprar: {row.cantidad.toLocaleString('es-CL')}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className='my-3 text-sm'>No hay productos por debajo del stock mínimo.</p>
        ))}
      <Button asChild variant='outline' className='mt-2'>
        <Link href='/purchases/replenishment'>Ver orden de compra</Link>
      </Button>
    </div>
  );
}
