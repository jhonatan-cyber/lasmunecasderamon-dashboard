'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useGenericFetch } from '@/hooks/shared/useGenericFetch';
import type { OrdenReposicion } from '@/modules/inventario/contracts';
import { PURCHASE_BUTTON_CLASS } from '@/components/purchases/buttonStyles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

  if (showProducts && (isLoading || error || data.length === 0)) return null;

  return (
    <Card aria-labelledby={showProducts ? 'replenishment-notice-title' : undefined}>
      {showProducts && (
        <CardHeader className='flex-row items-start justify-between gap-3 space-y-0'>
          <div>
            <CardTitle id='replenishment-notice-title' className='text-base'>
              Productos con stock bajo
            </CardTitle>
            <CardDescription className='mt-1'>
              Revisa las presentaciones que necesitan reposición.
            </CardDescription>
          </div>
          {!isLoading && !error && data.length > 0 && (
            <span className='inline-flex shrink-0 items-center rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground'>
              {data.length} {data.length === 1 ? 'producto' : 'productos'}
            </span>
          )}
        </CardHeader>
      )}
      {showProducts && (
        <CardContent className={data.length && !isLoading && !error ? 'space-y-4' : ''}>
          {data.length === 0 && !isLoading && !error && (
            <p className='text-sm text-muted-foreground'>
              No hay productos por debajo del stock mínimo.
            </p>
          )}
          {isLoading && (
            <p role='status' className='text-sm text-muted-foreground'>
              Comprobando stock…
            </p>
          )}
          {error && (
            <p role='alert' className='text-sm text-destructive'>
              No se pudo comprobar el stock mínimo.
            </p>
          )}
          {!isLoading && !error && data.length > 0 && (
            <ul
              className='max-h-80 divide-y divide-border overflow-y-auto'
              aria-label='Productos con stock bajo'
            >
              {data.map(row => (
                <li
                  key={row.id}
                  className='flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4 first:pt-0 last:pb-0'
                >
                  <div className='min-w-0 flex-1'>
                    <p className='font-medium leading-snug'>
                      {row.producto} · {row.presentacion}
                    </p>
                    <p className='mt-1 text-sm text-muted-foreground'>
                      Stock {row.stock_actual.toLocaleString('es-CL')} · Mínimo{' '}
                      {row.stock_minimo.toLocaleString('es-CL')} · Máximo{' '}
                      {row.stock_maximo.toLocaleString('es-CL')}
                    </p>
                  </div>
                  <p className='shrink-0 text-sm font-medium text-muted-foreground'>
                    Comprar:{' '}
                    <span className='text-foreground'>{row.cantidad.toLocaleString('es-CL')}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      )}
      <CardContent className={showProducts ? 'pt-0' : ''}>
        <Button asChild className={PURCHASE_BUTTON_CLASS}>
          <Link href='/purchases/replenishment'>Ver orden de compra</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
