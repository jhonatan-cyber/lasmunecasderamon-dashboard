'use client';

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SaleProductPhoto } from '@/components/sales/product-modal/SaleProductPhoto';
import { SaleProductDetails } from '@/components/sales/product-modal/SaleProductDetails';
import { SaleProductSummary } from './SaleProductSummary';
import { SaleProductFormatRows } from './SaleProductFormatRows';
import type { SaleProductItem } from '@/components/sales/product-modal/saleProductItems';

/** Página de productos en modo tarjetas (una card por presentación). */
export function SaleProductCards({
  items,
  availableHostesses,
  collapsed = {},
  onToggle = () => {}
}: {
  items: SaleProductItem[];
  availableHostesses: any[];
  collapsed?: Record<string, boolean>;
  onToggle?: (id: string) => void;
}) {
  return (
    <div className='grid grid-cols-1 gap-5'>
      {items.map(item => (
        <Card
          key={item.id}
          className={`flex min-w-0 flex-col overflow-hidden rounded-2xl transition-shadow hover:shadow-lg ${
            item.enCarrito > 0 ? 'ring-1 ring-emerald-500/50' : ''
          }`}
        >
          {collapsed[item.id] ? (
            <div className='p-4'>
              <SaleProductSummary item={item} collapsed onToggle={() => onToggle(item.id)} />
            </div>
          ) : (
            <>
              <div className='relative px-4 pt-4'>
                <Button
                  type='button'
                  variant='secondary'
                  size='sm'
                  className='absolute bottom-3 right-7 z-10'
                  aria-expanded
                  aria-label={`Ocultar detalles de ${item.name}`}
                  onClick={() => onToggle(item.id)}
                >
                  Ocultar detalles
                </Button>
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
                <SaleProductDetails item={item} showFormats={false} />
              </CardHeader>
              <CardContent className='flex flex-1 flex-col gap-4 p-4 pt-0'>
                <SaleProductFormatRows item={item} availableHostesses={availableHostesses} />
              </CardContent>
            </>
          )}
        </Card>
      ))}
    </div>
  );
}
