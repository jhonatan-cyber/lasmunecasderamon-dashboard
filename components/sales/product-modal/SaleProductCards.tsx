'use client';

import { Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/utils';
import { SaleProductPhoto } from '@/components/sales/product-modal/SaleProductPhoto';
import { SaleProductCollapseButton } from './SaleProductCollapseButton';
import { SaleProductDetails } from '@/components/sales/product-modal/SaleProductDetails';
import { SaleProductSummary } from './SaleProductSummary';
import { SaleProductFormatRows } from './SaleProductFormatRows';
import {
  getSaleProductFormatColumns,
  type SaleProductItem
} from '@/components/sales/product-modal/saleProductItems';

/** Productos en modo tarjetas, con una variante plana para Pedidos. */
export function SaleProductCards({
  items,
  availableHostesses,
  collapsed = {},
  onToggle = () => {},
  cardVariant = 'card'
}: {
  items: SaleProductItem[];
  availableHostesses: any[];
  collapsed?: Record<string, boolean>;
  onToggle?: (id: string) => void;
  cardVariant?: 'card' | 'plain';
}) {
  return (
    <div className='grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-5'>
      {items.map(item => {
        const columns = getSaleProductFormatColumns(item);
        const isCollapsed = collapsed[item.id];
        const fullRow = !isCollapsed && (columns.hasDrink || columns.hasHostess);
        const ProductContainer = cardVariant === 'plain' ? 'div' : Card;
        if (isCollapsed) {
          return (
            <Button
              variant='unstyled'
              key={item.id}
              type='button'
              aria-label={`Mostrar detalles de ${item.name}`}
              aria-expanded={false}
              onClick={() => onToggle(item.id)}
              className={cn(
                'flex min-w-0 w-full cursor-pointer flex-col overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                cardVariant === 'card' &&
                  'rounded-2xl border bg-card text-card-foreground shadow-xs transition-shadow hover:shadow-lg',
                cardVariant === 'card' && item.enCarrito > 0 && 'ring-1 ring-emerald-500/50'
              )}
            >
              <div className='w-full p-4'>
                <SaleProductSummary item={item} />
              </div>
            </Button>
          );
        }
        return (
          <ProductContainer
            key={item.id}
            className={cn(
              'flex min-w-0 flex-col overflow-hidden',
              cardVariant === 'card' && 'transition-shadow hover:shadow-lg',
              cardVariant === 'card' && item.enCarrito > 0 && 'ring-1 ring-emerald-500/50',
              fullRow && 'col-span-full'
            )}
          >
            {!fullRow ? (
              <>
                <div className='flex items-center gap-3 p-4 pb-0'>
                  <SaleProductPhoto foto={item.product.foto} name={item.name} large={false} />
                  <div className='flex min-w-0 flex-1 items-start justify-between gap-2'>
                    <SaleProductDetails item={item} showFormats={false} />
                    <SaleProductCollapseButton
                      productName={item.name}
                      collapsed={false}
                      onClick={() => onToggle(item.id)}
                    />
                  </div>
                </div>
                <CardContent className='p-4 pt-1'>
                  <SaleProductFormatRows item={item} availableHostesses={availableHostesses} />
                </CardContent>
              </>
            ) : (
              <>
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
                  <div className='flex items-start justify-between gap-2'>
                    <SaleProductDetails item={item} showFormats={false} />
                    <SaleProductCollapseButton
                      productName={item.name}
                      collapsed={false}
                      onClick={() => onToggle(item.id)}
                    />
                  </div>
                </CardHeader>
                <CardContent className='flex flex-1 flex-col gap-4 p-4 pt-0'>
                  <SaleProductFormatRows item={item} availableHostesses={availableHostesses} />
                </CardContent>
              </>
            )}
          </ProductContainer>
        );
      })}
    </div>
  );
}
