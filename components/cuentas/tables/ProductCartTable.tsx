import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
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
} from './cuentaTableStyles';

interface ProductoCarrito {
  id_producto: number | string;
  nombre: string;
  precio: number;
  cantidad: number;
  sub_total: number;
  categoria_nombre?: string;
  comision: number;
}

interface ProductCartTableProps {
  productos: ProductoCarrito[];
  onUpdateQuantity?: (index: number, newQuantity: number) => void;
  onRemove?: (index: number) => void;
  readOnly?: boolean;
  emptyMessage?: string;
  commissionMode?: 'line' | 'raw';
}

function ProductCartTableComponent({
  productos,
  onUpdateQuantity,
  onRemove,
  readOnly = false,
  emptyMessage = 'No hay productos agregados',
  commissionMode = 'line'
}: ProductCartTableProps) {
  const showActions = !readOnly;
  const columnCount = showActions ? 6 : 5;
  const getCommissionValue = (producto: ProductoCarrito) => {
    const commission = producto.comision || 0;
    return commissionMode === 'raw' ? commission : commission * (producto.cantidad || 0);
  };

  const renderHead = () => (
    <TableHeader className={CUENTA_TABLE_HEADER_CLASS}>
      <TableRow className={CUENTA_TABLE_HEADER_ROW_CLASS}>
        <TableHead className={CUENTA_TABLE_HEAD_CLASS}>Producto</TableHead>
        <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>Cantidad</TableHead>
        <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>Precio</TableHead>
        <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>Comisión</TableHead>
        <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>Sub total</TableHead>
        {showActions && (
          <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>Acciones</TableHead>
        )}
      </TableRow>
    </TableHeader>
  );

  if (productos.length === 0) {
    return (
      <div className={CUENTA_TABLE_CARD_CLASS}>
        <div className='overflow-x-auto'>
          <Table className={CUENTA_TABLE_CLASS}>
            {renderHead()}
            <TableBody>
              <TableRow className={CUENTA_TABLE_ROW_CLASS}>
                <TableCell
                  colSpan={columnCount}
                  className={`${CUENTA_TABLE_CELL_CLASS} text-center text-gray-500`}
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className={CUENTA_TABLE_CARD_CLASS}>
      <div className='overflow-x-auto'>
        <Table className={CUENTA_TABLE_CLASS}>
          {renderHead()}
          <TableBody>
            {productos.map((producto, index) => (
              <TableRow
                key={String(producto.id_producto ?? index)}
                className={`${CUENTA_TABLE_ROW_CLASS} ${index === 0 ? 'first:rounded-t-xl' : ''} ${index === productos.length - 1 ? 'last:rounded-b-xl' : ''}`}
              >
                <TableCell className={CUENTA_TABLE_CELL_CLASS}>
                  <div className='flex flex-col gap-1'>
                    <div className='font-medium'>{producto.nombre}</div>
                    {producto.categoria_nombre ? (
                      <div className='text-xs text-gray-500'>{producto.categoria_nombre}</div>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
                  {showActions ? (
                    <div className='flex items-center justify-center gap-2'>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() =>
                          onUpdateQuantity?.(index, Math.max(1, (producto.cantidad || 1) - 1))
                        }
                        className='w-6 h-6 p-0 rounded-full hover:scale-105 transition-all duration-200'
                      >
                        <Minus className='h-3 w-3' />
                      </Button>
                      <span className='w-8 text-center'>{producto.cantidad}</span>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => onUpdateQuantity?.(index, (producto.cantidad || 1) + 1)}
                        className='w-6 h-6 p-0 rounded-full hover:scale-105 transition-all duration-200'
                      >
                        <Plus className='h-3 w-3' />
                      </Button>
                    </div>
                  ) : (
                    <span className='font-medium'>{producto.cantidad}</span>
                  )}
                </TableCell>
                <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
                  {formatCurrencyNoDecimals(producto.precio || 0)}
                </TableCell>
                  <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
                    {formatCurrencyNoDecimals(getCommissionValue(producto))}
                  </TableCell>
                <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
                  {formatCurrencyNoDecimals(producto.sub_total || 0)}
                </TableCell>
                {showActions && (
                  <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
                    <Button
                      size='icon'
                      variant='outline'
                      onClick={() => onRemove?.(index)}
                      className='rounded-full text-red-600 hover:text-red-700 hover:scale-105 transition-all duration-200'
                    >
                      <Trash2 className='h-3 w-3' />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export const ProductCartTable = memo(ProductCartTableComponent);
