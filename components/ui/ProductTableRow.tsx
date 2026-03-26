 
import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X, ShoppingCart } from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { QuantityControl } from './QuantityControl';

interface ProductTableRowProps {
  producto: any;
  cantidad: number;
  isSelected: boolean;
  selectedQuantity?: number;
  onCantidadChange: (cantidad: number) => void;
  onAddToSelection: () => void;
  onRemoveFromSelection: () => void;
  onAddToCart: () => void;
}

export const ProductTableRow = React.memo<ProductTableRowProps>(({
  producto,
  cantidad,
  isSelected,
  selectedQuantity,
  onCantidadChange,
  onAddToSelection,
  onRemoveFromSelection,
  onAddToCart
}) => {
  return (
    <TableRow className={isSelected ? 'bg-blue-50' : ''}>
      <TableCell>
        <div className="flex items-center gap-2">
          {isSelected && selectedQuantity && (
            <Badge variant="secondary" className="text-xs">
              {selectedQuantity}
            </Badge>
          )}
          <div>
            <div className="font-medium">{producto.nombre || producto.name}</div>
            {(producto.codigo || producto.code) && (
              <div className="text-xs text-gray-500">
                {producto.codigo || producto.code}
              </div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <span className="text-green-600 font-medium">
          {formatCurrencyNoDecimals(producto.precio || producto.price)}
        </span>
      </TableCell>
      <TableCell className="text-center">
        <span className="text-orange-600">
          {formatCurrencyNoDecimals(producto.comision || producto.commission || 0)}
        </span>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center">
          <QuantityControl
            value={cantidad}
            onChange={onCantidadChange}
            size="sm"
          />
        </div>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1">
          {isSelected ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onRemoveFromSelection}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="w-3 h-3" />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={onAddToSelection}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Plus className="w-3 h-3" />
            </Button>
          )}
          <Button
            size="sm"
            onClick={onAddToCart}
            className="bg-black text-white hover:bg-gray-800"
          >
            <ShoppingCart className="w-3 h-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});

ProductTableRow.displayName = 'ProductTableRow';

