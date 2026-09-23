'use client';

import Image from 'next/image';
import React, { useState } from 'react';
import { Product, Presentacion } from '@/types/product';
import {
  Pencil,
  Trash2,
  CheckCircle,
  Power,
  MoreVertical,
  GripVertical,
  Info,
  Tag as TagIcon,
  DollarSign,
  Eye
} from 'lucide-react';
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
import { ProductDetailsModal } from './ProductDetailsModal';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

interface ProductCardProps {
  product: Product;
  presentation?: Presentacion | null;
  rowId?: string | number;
  onEdit: (product: Product, presentation: Presentacion | null) => void;
  onDelete: (product: Product) => void;
  onActivate: (product: Product) => void;
  onDeactivate: (product: Product) => void;
  isDraggable?: boolean;
  isLoading?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  presentation = null,
  rowId,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
  isDraggable = false,
  isLoading = false
}) => {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { hasPermission } = useUserPermissions();

  const canEdit = hasPermission('productos', 'editar_categoria');
  const canDelete = hasPermission('productos', 'eliminar');
  const canActivate = hasPermission('productos', 'activar');
  const canDeactivate = hasPermission('productos', 'desactivar');

  const hasAnyAction = canEdit || canDelete || canActivate || canDeactivate;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rowId ?? product.id,
    disabled: !isDraggable
  });

  const style = isDraggable
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 50 : 'auto'
      }
    : {};

  const handleDeleteClick = () => {
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    onDelete(product);
    setDeleteModalOpen(false);
  };

  return (
    <>
      <Card
        className='group relative border-none bg-white dark:bg-slate-900/40 backdrop-blur-xs shadow-md hover:shadow-xl transition-all duration-300 rounded-4xl overflow-hidden'
        ref={isDraggable ? setNodeRef : undefined}
        style={style}
      >
        {}
        {isDraggable && (
          <div
            {...attributes}
            {...listeners}
            className='absolute top-4 left-4 z-20 cursor-grab active:cursor-grabbing p-2 bg-white/80 dark:bg-slate-900/80 rounded-full shadow-xs opacity-0 group-hover:opacity-100 transition-opacity'
          >
            <GripVertical className='w-4 h-4 text-gray-400 group-active:text-purple-500' />
          </div>
        )}

        {}
        <div className='absolute top-4 right-4 z-20'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8 bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-800 rounded-full shadow-xs opacity-0 group-hover:opacity-100 transition-all duration-300'
              >
                <MoreVertical className='h-4 w-4 text-gray-600 dark:text-gray-300' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align='end'
              className='rounded-2xl border-gray-100 dark:border-slate-800 p-2'
            >
              <DropdownMenuItem
                onClick={() => setDetailsOpen(true)}
                className='rounded-xl cursor-pointer group flex items-center gap-2 py-2 text-sm'
              >
                <div className='h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center'>
                  <Eye className='h-4 w-4 text-blue-600 dark:text-blue-400' />
                </div>
                <span className='font-medium'>Ver detalles</span>
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem
                  onClick={() => onEdit(product, presentation)}
                  className='rounded-xl cursor-pointer group flex items-center gap-2 py-2 text-sm'
                >
                  <div className='h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center'>
                    <Pencil className='h-4 w-4 text-orange-600 dark:text-orange-400' />
                  </div>
                  <span className='font-medium'>Editar Producto</span>
                </DropdownMenuItem>
              )}
              {product.status === 1 && canDeactivate ? (
                <DropdownMenuItem
                  onClick={() => onDeactivate(product)}
                  className='rounded-xl cursor-pointer group flex items-center gap-2 py-2 text-sm'
                >
                  <div className='h-8 w-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center'>
                    <Power className='h-4 w-4 text-red-600 dark:text-red-400' />
                  </div>
                  <span className='font-medium'>Desactivar</span>
                </DropdownMenuItem>
              ) : product.status === 0 && canActivate ? (
                <DropdownMenuItem
                  onClick={() => onActivate(product)}
                  className='rounded-xl cursor-pointer group flex items-center gap-2 py-2 text-sm'
                >
                  <div className='h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center'>
                    <CheckCircle className='h-4 w-4 text-green-600 dark:text-green-400' />
                  </div>
                  <span className='font-medium'>Activar</span>
                </DropdownMenuItem>
              ) : null}
              {canDelete && (
                <DropdownMenuItem
                  onClick={handleDeleteClick}
                  className='rounded-xl cursor-pointer group flex items-center gap-2 py-2 text-sm bg-red-50/50 dark:bg-red-900/10'
                >
                  <div className='h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center'>
                    <Trash2 className='h-4 w-4 text-red-600 cursor-pointer' />
                  </div>
                  <span className='text-red-600 font-semibold'>Eliminar</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {}
        <div className='relative w-full aspect-4/3 overflow-hidden bg-white group-hover:scale-105 transition-transform duration-500'>
          <Image
            src={
              !presentation?.foto || presentation.foto === 'default.png' || presentation.foto === ''
                ? !product.foto || product.foto === 'default.png' || product.foto === ''
                  ? '/api/images/products/default.png'
                  : product.foto.startsWith('http')
                    ? product.foto
                    : `/api/images/products/${product.foto}`
                : presentation.foto.startsWith('http')
                  ? presentation.foto
                  : `/api/images/products/${presentation.foto}`
            }
            alt={presentation ? `${product.name} ${presentation.nombre}` : product.name}
            fill
            sizes='(max-width: 768px) 100vw, 33vw'
            className='w-full h-full object-cover'
          />
          {}
          <div className='absolute bottom-3 left-3 flex gap-2'>
            {product.status === 1 ? (
              <div className='flex items-center gap-1.5 px-3 py-1 bg-green-500/90 backdrop-blur-md text-white rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg'>
                <div className='w-1.5 h-1.5 rounded-full bg-white animate-pulse' />
                Activo
              </div>
            ) : (
              <div className='flex items-center gap-1.5 px-3 py-1 bg-red-500/90 backdrop-blur-md text-white rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg'>
                Inactivo
              </div>
            )}
          </div>
        </div>

        <CardContent className='p-6 space-y-4'>
          <div className='space-y-1.5'>
            <div className='flex items-center gap-2 text-gray-400 dark:text-gray-500'>
              <TagIcon className='h-3 w-3' />
              <span className='text-[10px] uppercase font-bold tracking-widest font-mono'>
                {presentation?.codigo_barras || product.code}
              </span>
            </div>
            <h3 className='text-lg font-bold text-gray-900 dark:text-neutral-100 line-clamp-1 group-hover:text-purple-600 transition-colors'>
              {product.name}
            </h3>
            {presentation && (
              <span className='inline-flex items-center rounded-full bg-gray-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-200 w-fit'>
                {presentation.nombre}
              </span>
            )}
          </div>

          <div className='grid grid-cols-2 gap-4 pb-4 border-b border-gray-100 dark:border-slate-800'>
            <div className='space-y-1'>
              <p className='text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider'>
                Precio compra
              </p>
              <div className='flex items-center gap-1 text-gray-900 dark:text-neutral-100 font-bold'>
                <span className='text-purple-500 text-xs'>$</span>
                <span className='text-base'>
                  {formatCurrencyCLP(presentation?.precio_compra ?? product.price).replace('$', '')}
                </span>
              </div>
            </div>
            <div className='space-y-1'>
              <p className='text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider'>
                Stock
              </p>
              <div className='flex items-center gap-1 text-gray-900 dark:text-neutral-100 font-medium'>
                <Badge className='bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-xs'>
                  {presentation ? (presentation.stock ?? 0) : (product.stock_almacen ?? 0)} un.
                </Badge>
              </div>
            </div>
          </div>

          {product.description ? (
            <div className='flex items-start gap-2 text-gray-500 dark:text-gray-400'>
              <div className='shrink-0 mt-1'>
                <Info className='h-3 w-3' />
              </div>
              <p className='text-xs leading-relaxed line-clamp-2 italic'>
                &quot;{product.description}&quot;
              </p>
            </div>
          ) : (
            <div className='h-10' />
          )}
        </CardContent>
      </Card>

      <DeleteProductConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        productName={product.name}
        isLoading={isLoading}
      />

      <ProductDetailsModal
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        product={product}
        presentation={presentation}
      />
    </>
  );
};

export default ProductCard;
