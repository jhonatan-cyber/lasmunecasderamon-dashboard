import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, DollarSign, Coins } from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { QuantityControl } from './QuantityControl';

interface ProductGridCardProps {
  producto: any;
  cantidad: number;
  isSelected: boolean;
  selectedQuantity?: number;
  onCantidadChange: (cantidad: number) => void;
  onAddToSelection: () => void;
  onRemoveFromSelection: () => void;
  onAddToCart: () => void;
}

export const ProductGridCard = React.memo<ProductGridCardProps>(
  ({ producto, cantidad, isSelected, selectedQuantity, onCantidadChange, onAddToCart }) => {
    return (
      <Card
        className={`transition-all duration-200 hover:shadow-lg ${
          isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
        }`}
      >
        <CardContent className='p-4'>
          <div className='space-y-3'>
            {}
            <div className='flex items-start justify-between'>
              <div className='flex-1'>
                <h3 className='font-semibold text-sm line-clamp-2'>
                  {producto.nombre || producto.name}
                </h3>
                {(producto.codigo || producto.code) && (
                  <p className='text-xs text-gray-500 mt-1'>{producto.codigo || producto.code}</p>
                )}
              </div>
              {isSelected && selectedQuantity && (
                <Badge variant='secondary' className='ml-2 text-xs'>
                  {selectedQuantity}
                </Badge>
              )}
            </div>

            {}
            <div className='space-y-1'>
              <div className='flex items-center gap-1'>
                <DollarSign className='w-3 h-3 text-green-600' />
                <span className='text-sm font-medium text-green-600'>
                  {formatCurrencyNoDecimals(producto.precio || producto.price)}
                </span>
              </div>
              {(producto.comision || producto.commission) > 0 && (
                <div className='flex items-center gap-1'>
                  <Coins className='w-3 h-3 text-orange-600' />
                  <span className='text-xs text-orange-600'>
                    Comisión: {formatCurrencyNoDecimals(producto.comision || producto.commission)}
                  </span>
                </div>
              )}
            </div>

            {}
            <div className='flex items-center justify-between'>
              <QuantityControl value={cantidad} onChange={onCantidadChange} size='sm' />

              {}
              <div className='flex gap-1'>
                <Button
                  size='sm'
                  onClick={onAddToCart}
                  className='bg-black text-white dark:bg-black dark:text-white  dark:hover:bg-white! dark:hover:text-black! rounded-full hover:bg-white! hover:text-black! transition-all hover:scale-105 border-2'
                >
                  <Plus className='w-3 h-3' />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

ProductGridCard.displayName = 'ProductGridCard';
