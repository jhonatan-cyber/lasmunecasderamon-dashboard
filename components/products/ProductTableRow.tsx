import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { QuantityControl } from './QuantityControl';
import {
  CUENTA_TABLE_CELL_CLASS,
  CUENTA_TABLE_ROW_CLASS
} from '@/components/cuentas/tables/cuentaTableStyles';

interface ProductTableRowProps {
  producto: any;
  cantidad: number;
  isSelected: boolean;
  selectedQuantity?: number;
  onCantidadChange: (cantidad: number) => void;
  onAddToSelection: () => void;
  onRemoveFromSelection: () => void;
  onAddToCart: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export const ProductTableRow = React.memo<ProductTableRowProps>(
  ({
    producto,
    cantidad,
    isSelected,
    selectedQuantity,
    onCantidadChange,
    onAddToCart,
    isFirst = false,
    isLast = false
  }) => {
    return (
      <TableRow
        className={`${CUENTA_TABLE_ROW_CLASS} ${isFirst ? 'first:rounded-t-xl' : ''} ${isLast ? 'last:rounded-b-xl' : ''} ${isSelected ? 'bg-blue-50' : ''}`}
      >
        <TableCell className={CUENTA_TABLE_CELL_CLASS}>
          <div className='flex items-center gap-2'>
            {isSelected && selectedQuantity ? (
              <Badge variant='secondary' className='text-xs'>
                {selectedQuantity}
              </Badge>
            ) : null}
            <div>
              <div className='font-medium'>{producto.nombre || producto.name}</div>
              {producto.codigo || producto.code ? (
                <div className='text-xs text-gray-500'>{producto.codigo || producto.code}</div>
              ) : null}
            </div>
          </div>
        </TableCell>
        <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
          <span className='text-green-600 font-medium'>
            {formatCurrencyNoDecimals(producto.precio || producto.price)}
          </span>
        </TableCell>
        <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
          <span className='text-gray-600'>{producto.categoria || 'Sin categoría'}</span>
        </TableCell>
        <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
          <span className='text-orange-600'>
            {formatCurrencyNoDecimals(producto.comision || producto.commission || 0)}
          </span>
        </TableCell>
        <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
          <div className='flex items-center justify-center'>
            <QuantityControl value={cantidad} onChange={onCantidadChange} size='sm' />
          </div>
        </TableCell>
        <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
          <div className='flex items-center justify-center gap-1'>
            <Button
              size='sm'
              onClick={onAddToCart}
              className='bg-black text-white dark:bg-black dark:text-white dark:hover:bg-white! dark:hover:text-black! rounded-full hover:bg-white! hover:text-black! transition-all hover:scale-105 border-2'
            >
              <Plus className='w-3 h-3' />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }
);

ProductTableRow.displayName = 'ProductTableRow';
