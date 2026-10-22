'use client';

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import {
  CUENTA_TABLE_CARD_CLASS,
  CUENTA_TABLE_CELL_CLASS,
  CUENTA_TABLE_CLASS,
  CUENTA_TABLE_ROW_CLASS
} from '@/components/accounts/tables/cuentaTableStyles';
import { SaleProductPhoto } from '@/components/sales/product-modal/SaleProductPhoto';
import { SaleProductSummary } from './SaleProductSummary';
import { SaleProductDetails } from '@/components/sales/product-modal/SaleProductDetails';
import { SaleProductFormatRows } from './SaleProductFormatRows';
import type { SaleProductItem } from '@/components/sales/product-modal/saleProductItems';

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
    <div className={CUENTA_TABLE_CARD_CLASS}>
      <div className='overflow-x-auto'>
        <Table className={`${CUENTA_TABLE_CLASS} min-w-[1040px] table-fixed`}>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id} className={CUENTA_TABLE_ROW_CLASS}>
                <TableCell colSpan={4} className={`${CUENTA_TABLE_CELL_CLASS} text-left align-top`}>
                  {collapsed[item.id] ? (
                    <SaleProductSummary item={item} collapsed onToggle={() => onToggle(item.id)} />
                  ) : (
                    <div className='flex items-start gap-4'>
                      <SaleProductPhoto foto={item.product.foto} name={item.name} large={false} />
                      <div className='min-w-0 flex-1'>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='mb-2'
                          aria-expanded
                          aria-label={`Ocultar detalles de ${item.name}`}
                          onClick={() => onToggle(item.id)}
                        >
                          Ocultar detalles
                        </Button>
                        <SaleProductDetails item={item} showFormats={false} />
                      </div>
                    </div>
                  )}
                  {!collapsed[item.id] && (
                    <div className='mt-4'>
                      <SaleProductFormatRows item={item} availableHostesses={availableHostesses} />
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
