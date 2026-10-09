'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  CUENTA_TABLE_CARD_CLASS,
  CUENTA_TABLE_CELL_CLASS,
  CUENTA_TABLE_CLASS,
  CUENTA_TABLE_HEAD_CLASS,
  CUENTA_TABLE_HEADER_CLASS,
  CUENTA_TABLE_HEADER_ROW_CLASS,
  CUENTA_TABLE_ROW_CLASS
} from '@/components/cuentas/tables/cuentaTableStyles';
import { SaleProductPhoto } from '@/components/sales/product-modal/SaleProductPhoto';
import { SaleProductDetails } from '@/components/sales/product-modal/SaleProductDetails';
import { SaleProductHostess } from '@/components/sales/product-modal/SaleProductHostess';
import type { SaleProductItem } from '@/components/sales/product-modal/saleProductItems';

/** Página de productos en modo tabla (una fila por presentación). */
export function SaleProductTable({
  items,
  availableHostesses
}: {
  items: SaleProductItem[];
  availableHostesses: any[];
}) {
  return (
    <div className={CUENTA_TABLE_CARD_CLASS}>
      <div className='overflow-x-auto'>
        <Table className={CUENTA_TABLE_CLASS}>
          <TableHeader className={CUENTA_TABLE_HEADER_CLASS}>
            <TableRow className={CUENTA_TABLE_HEADER_ROW_CLASS}>
              <TableHead className={CUENTA_TABLE_HEAD_CLASS}>Producto</TableHead>
              <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>Anfitriona</TableHead>
              <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>Agregar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id} className={CUENTA_TABLE_ROW_CLASS}>
                <TableCell
                  className={`${CUENTA_TABLE_CELL_CLASS} min-w-[300px] text-left align-top`}
                >
                  <div className='flex items-start gap-4'>
                    <SaleProductPhoto foto={item.product.foto} name={item.name} large={false} />
                    <div className='min-w-0 flex-1'>
                      <SaleProductDetails item={item} />
                    </div>
                  </div>
                </TableCell>
                <TableCell
                  className={`${CUENTA_TABLE_CELL_CLASS} min-w-[210px] text-center align-middle`}
                >
                  <SaleProductHostess item={item} availableHostesses={availableHostesses} />
                </TableCell>
                <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center align-middle`}>
                  <Button
                    size='icon'
                    variant='outline'
                    aria-label='Agregar producto'
                    className='h-10 w-10 rounded-full bg-black text-white shadow-md transition-all duration-200 hover:scale-110 hover:bg-black/80 disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-white/90'
                    onClick={item.onAgregar}
                    disabled={item.agregarDisabled}
                  >
                    <Plus className='h-4 w-4' />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
