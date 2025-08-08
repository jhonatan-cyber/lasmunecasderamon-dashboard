import React, { useState } from 'react';
import { Product } from '@/types/product';
import { Pencil, Trash2, CheckCircle, Power, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { DeleteProductConfirmModal } from './DeleteProductConfirmModal';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onActivate: (product: Product) => void;
  onDeactivate: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate
}) => {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const handleDeleteClick = () => {
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    onDelete(product);
    setDeleteModalOpen(false);
  };

  return (
    <>
      <Card className='hover:shadow-md transition-shadow'>
        <CardHeader className='pb-3 p-4 sm:p-6'>
          <div className='flex items-start justify-between'>
            <CardTitle className='text-sm sm:text-lg font-bold flex-1 truncate'>{product.name}</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='bg-white hover:bg-gray-200 rounded-full hover:scale-105 transition-all duration-200'
                >
                  <MoreVertical className='h-3 w-3 sm:h-4 sm:w-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuItem
                        onClick={() => onEdit(product)}
                        className='cursor-pointer group'
                      >
                        <Pencil
                          className='mr-2 text-purple-600 group-hover:text-purple-700 transition-colors'
                        />
                        <span className='group-hover:text-purple-700 transition-colors'>
                          Editar
                        </span>
                      </DropdownMenuItem>
                    </TooltipTrigger>
                    <TooltipContent>Editar producto</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {product.status === 1 ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuItem
                          onClick={() => onDeactivate(product)}
                          className='cursor-pointer group'
                        >
                          <Power
                            className='mr-2 text-orange-600 group-hover:text-orange-700 transition-colors'
                          />
                          <span className='group-hover:text-orange-700 transition-colors'>
                            Desactivar
                          </span>
                        </DropdownMenuItem>
                      </TooltipTrigger>
                      <TooltipContent>Desactivar producto</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuItem
                          onClick={() => onActivate(product)}
                          className='cursor-pointer group'
                        >
                          <CheckCircle
                            className='mr-2 text-green-600 group-hover:text-green-700 transition-colors'
                          />
                          <span className='group-hover:text-green-700 transition-colors'>
                            Activar
                          </span>
                        </DropdownMenuItem>
                      </TooltipTrigger>
                      <TooltipContent>Activar producto</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuItem
                        onClick={handleDeleteClick}
                        className='cursor-pointer group'
                      >
                        <Trash2
                          className='mr-2 text-red-600 group-hover:text-red-700 transition-colors'
                        />
                        <span className='group-hover:text-red-700 transition-colors'>Eliminar</span>
                      </DropdownMenuItem>
                    </TooltipTrigger>
                    <TooltipContent>Eliminar producto</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className='space-y-3 p-4 sm:p-6 pt-0'>
          <div className='flex justify-center items-center mb-3'>
            <img
              src={
                !product.foto ||
                product.foto === 'default.png' ||
                product.foto === '' ||
                product.foto === null ||
                product.foto === undefined
                  ? '/img/products/default.png'
                  : `/img/products/${product.foto}`
              }
              alt={product.name}
              className='w-full h-32 sm:h-40 object-cover rounded-lg'
              onError={e => {
                const target = e.target as HTMLImageElement;
                if (!target.src.endsWith('/img/products/default.png')) {
                  target.src = '/img/products/default.png';
                }
              }}
            />
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-xs sm:text-sm text-gray-500'>Código:</span>
            <span className='font-mono text-xs sm:text-sm font-medium'>{product.code}</span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-xs sm:text-sm text-gray-500'>Precio:</span>
            <span className='font-medium text-sm sm:text-base'>${product.price.toLocaleString('es-CL')}</span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-xs sm:text-sm text-gray-500'>Comisión:</span>
            <span className='font-medium text-sm sm:text-base'>${product.commission.toLocaleString('es-CL')}</span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-xs sm:text-sm text-gray-500'>Estado:</span>
            {product.status === 1 ? (
              <Badge className='bg-green-100 text-green-700 rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm'>Activo</Badge>
            ) : (
              <Badge className='bg-red-200 text-red-600 rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm'>Inactivo</Badge>
            )}
          </div>
          {product.description && (
            <div className='pt-2 border-t'>
              <p className='text-xs sm:text-sm text-gray-600 line-clamp-2'>{product.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteProductConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        productName={product.name}
      />
    </>
  );
};

export default ProductCard;
