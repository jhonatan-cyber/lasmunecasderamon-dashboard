'use client';

import {
  CUENTA_TABLE_CARD_CLASS,
  CUENTA_TABLE_CELL_CLASS,
  CUENTA_TABLE_ROW_CLASS
} from '@/components/accounts/tables/cuentaTableStyles';
import { SaleProductPhoto } from '@/components/sales/product-modal/SaleProductPhoto';
import { SaleProductCollapseButton } from './SaleProductCollapseButton';
import { SaleProductSummary } from './SaleProductSummary';
import { SaleProductDetails } from '@/components/sales/product-modal/SaleProductDetails';
import { SaleProductFormatRows } from './SaleProductFormatRows';
import {
  getSaleProductFormatColumns,
  type SaleProductItem
} from '@/components/sales/product-modal/saleProductItems';

/** Página de productos en modo tabla (una fila por presentación). */
export function SaleProductTable({
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
    <div
      role='table'
      aria-label='Productos en bar'
      className={`${CUENTA_TABLE_CARD_CLASS} grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-4 bg-transparent shadow-none`}
    >
      {items.map(item => {
        const columns = getSaleProductFormatColumns(item);
        const fullRow = columns.hasDrink || columns.hasHostess;
        return (
          <div
            key={item.id}
            role='row'
            className={`${CUENTA_TABLE_ROW_CLASS} min-w-0 rounded-2xl border bg-card ${fullRow ? 'col-span-full' : ''}`}
          >
            <div role='cell' className={`${CUENTA_TABLE_CELL_CLASS} text-left align-top`}>
              {collapsed[item.id] ? (
                <SaleProductSummary item={item} collapsed onToggle={() => onToggle(item.id)} />
              ) : (
                <div className='flex items-start gap-4'>
                  <SaleProductPhoto foto={item.product.foto} name={item.name} large={false} />
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-start justify-between gap-2'>
                      <SaleProductDetails item={item} showFormats={false} />
                      <SaleProductCollapseButton
                        productName={item.name}
                        collapsed={false}
                        onClick={() => onToggle(item.id)}
                      />
                    </div>
                  </div>
                </div>
              )}
              {!collapsed[item.id] && (
                <div className='mt-4'>
                  <SaleProductFormatRows item={item} availableHostesses={availableHostesses} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
