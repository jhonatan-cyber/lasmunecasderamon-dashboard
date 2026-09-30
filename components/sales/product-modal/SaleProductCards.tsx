'use client';

import { Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { SaleProductPhoto } from '@/components/sales/product-modal/SaleProductPhoto';
import { SaleProductDetails } from '@/components/sales/product-modal/SaleProductDetails';
import { SaleProductHostess } from '@/components/sales/product-modal/SaleProductHostess';
import {
  SaleProductCommission,
  SaleProductPrice,
  SaleProductQuantity
} from '@/components/sales/product-modal/SaleProductCells';
import type { SaleProductItem } from '@/components/sales/product-modal/saleProductItems';

/** Página de productos en modo tarjetas (una card por presentación). */
export function SaleProductCards({
  items,
  availableHostesses
}: {
  items: SaleProductItem[];
  availableHostesses: any[];
}) {
  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
      {items.map(item => (
        <Card
          key={item.id}
          className={`flex min-w-0 flex-col overflow-hidden rounded-2xl transition-shadow hover:shadow-lg ${
            item.enCarrito > 0 ? 'ring-1 ring-emerald-500/50' : ''
          }`}
        >
          <div className='relative px-4 pt-4'>
            <SaleProductPhoto foto={item.product.foto} name={item.name} large />
            {item.enCarrito > 0 && (
              <span className='absolute right-7 top-7 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white shadow'>
                <Check className='size-3' aria-hidden='true' />
                {item.enCarrito}
              </span>
            )}
          </div>
          <CardHeader className='p-4'>
            <CardTitle className='sr-only'>{item.name}</CardTitle>
            <SaleProductDetails item={item} />
          </CardHeader>
          <CardContent className='flex flex-1 flex-col gap-4 p-4 pt-0'>
            <dl className='grid grid-cols-2 gap-3 rounded-xl border border-neutral-200/60 bg-muted p-3 dark:border-white/10'>
              <div>
                <dt className='text-xs text-muted-foreground'>Precio</dt>
                <dd className='font-semibold tabular-nums'>
                  <SaleProductPrice item={item} />
                </dd>
              </div>
              <div>
                <dt className='text-xs text-muted-foreground'>Comisión</dt>
                <dd className='font-semibold tabular-nums'>
                  <SaleProductCommission item={item} />
                </dd>
              </div>
            </dl>
            <div className='flex items-center justify-between gap-2'>
              <span className='text-sm text-muted-foreground'>Cantidad</span>
              <SaleProductQuantity item={item} />
            </div>
            <div className='flex flex-col gap-2'>
              <span className='text-sm text-muted-foreground'>Anfitriona</span>
              <SaleProductHostess item={item} availableHostesses={availableHostesses} />
            </div>
          </CardContent>
          <CardFooter className='border-t p-4'>
            <Button
              aria-label='Agregar producto'
              onClick={item.onAgregar}
              disabled={item.agregarDisabled}
              className='h-11 w-full rounded-full bg-black text-sm font-bold text-white shadow-md transition-all hover:scale-[1.02] hover:bg-black/80 disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-white/90'
            >
              <Plus className='mr-2 size-4' aria-hidden='true' />
              Agregar · {item.totalAgregar}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
