'use client';

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
  Eye
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipPortal
} from '@/components/ui/tooltip';
import { DeleteConfirmModal } from '@/components/shared/DeleteConfirmModal';
import { ProductDetailsModal } from './ProductDetailsModal';
import { VencimientoBadge } from './VencimientoBadge';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { InteractiveProductPhoto } from '@/components/shared/InteractiveProductPhoto';
import { StaggeredEntrance } from '@/components/shared/StaggeredEntrance';

interface ProductCardProps {
  product: Product;
  presentation?: Presentacion | null;
  rowId?: string | number;
  onEdit: (product: Product, presentation: Presentacion | null) => void;
  onDelete: (product: Product, presentation?: Presentacion | null) => void;
  onActivate: (product: Product) => void;
  onDeactivate: (product: Product) => void;
  isDraggable?: boolean;
  isLoading?: boolean;
  entranceIndex?: number;
}

/** Returns a Tailwind colour+weight class for a stock value relative to its minimum. */
const stockColorClass = (value: number, min?: number | null): string => {
  if (value === 0) return 'text-red-600 font-bold';
  if (min != null && value < min) return 'text-amber-600 font-semibold';
  return 'text-emerald-600 font-medium';
};

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  presentation = null,
  rowId,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
  isDraggable = false,
  isLoading = false,
  entranceIndex
}) => {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { hasPermission } = useUserPermissions();

  const stockBodega = Number(
    presentation ? (presentation.stock ?? 0) : (product.stock_almacen ?? 0)
  );
  const stockBar = Number(presentation?.stock_bar ?? 0);
  const totalStock = stockBodega + stockBar;
  const stockMinimo = presentation?.stock_minimo ?? null;
  const stockMaximo = presentation?.stock_maximo ?? null;
  const lowStock = stockMinimo != null && totalStock < stockMinimo;

  const canEdit = hasPermission('products', 'edit');
  const canDelete = hasPermission('products', 'delete');
  const canActivate = hasPermission('products', 'activate');
  const canDeactivate = hasPermission('products', 'deactivate');

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
    onDelete(product, presentation);
    setDeleteModalOpen(false);
  };

  const photoSrc =
    !presentation?.foto || presentation.foto === 'default.png' || presentation.foto === ''
      ? !product.foto || product.foto === 'default.png' || product.foto === ''
        ? '/api/images/products/default.png'
        : product.foto.startsWith('http')
          ? product.foto
          : `/api/images/products/${product.foto}`
      : presentation.foto.startsWith('http')
        ? presentation.foto
        : `/api/images/products/${presentation.foto}`;

  const photoAlt = presentation ? `${product.name} ${presentation.nombre}` : product.name;

  // Category: prefer presentation-level name, fall back to product-level
  const categoriaLabel =
    (presentation?.categoria_nombre && presentation.categoria_nombre.trim() !== ''
      ? presentation.categoria_nombre
      : null) ?? (product.categoria && product.categoria.trim() !== '' ? product.categoria : null);

  const tooltipMinMax = `Mín: ${stockMinimo != null ? stockMinimo.toLocaleString('es-CL') : 'Sin configurar'} / Máx: ${stockMaximo != null ? stockMaximo.toLocaleString('es-CL') : 'Sin configurar'}`;

  return (
    <TooltipProvider>
      <StaggeredEntrance index={entranceIndex} className='h-full'>
        <Card
          className={`group relative h-full border border-gray-200 dark:border-slate-700 backdrop-blur-xs shadow-md hover:shadow-xl transition-all duration-300 rounded-4xl overflow-hidden ${lowStock ? 'bg-red-50 dark:bg-red-950/30 ring-2 ring-inset ring-red-400 dark:ring-red-700' : 'bg-white dark:bg-slate-900'}`}
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
                  aria-label='Más acciones'
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

          {/* Imagen del producto */}
          <InteractiveProductPhoto
            src={photoSrc}
            alt={photoAlt}
            containerClassName='relative w-full aspect-4/3 overflow-hidden bg-gray-100 dark:bg-slate-800'
            photoClassName='object-contain p-4'
          >
            <div className='pointer-events-none absolute bottom-3 left-3 z-10 flex gap-2'>
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
          </InteractiveProductPhoto>

          <CardContent className='p-6 space-y-4'>
            <div className='space-y-1.5'>
              {/* Barcode / code row */}
              <div className='flex items-center gap-2 text-gray-400 dark:text-gray-500'>
                <TagIcon className='h-3 w-3' />
                <span className='text-[10px] uppercase font-bold tracking-widest font-mono'>
                  {presentation?.codigo_barras || product.code}
                </span>
              </div>
              {/* Name + presentation badge */}
              <div className='flex min-w-0 items-center gap-2'>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h3
                      tabIndex={0}
                      className='min-w-0 text-lg font-bold text-gray-900 dark:text-neutral-100 line-clamp-1 group-hover:text-purple-600 transition-colors'
                    >
                      {product.name}
                    </h3>
                  </TooltipTrigger>
                  <TooltipPortal>
                    <TooltipContent className='max-w-xs break-words'>{product.name}</TooltipContent>
                  </TooltipPortal>
                </Tooltip>
                {presentation && (
                  <Badge variant='secondary' className='shrink-0'>
                    {presentation.nombre}
                  </Badge>
                )}
              </div>
              {/* Category badge */}
              {categoriaLabel && (
                <Badge variant='outline' className='text-xs gap-1'>
                  <TagIcon className='h-3 w-3' />
                  {categoriaLabel}
                </Badge>
              )}
              {lowStock && (
                <Badge className='mt-2 rounded-full bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'>
                  Stock bajo · Total: {totalStock.toLocaleString('es-CL')}
                </Badge>
              )}
              {product.fecha_vencimiento && (
                <div className='mt-2 flex'>
                  <VencimientoBadge fecha={product.fecha_vencimiento} />
                </div>
              )}
            </div>

            {/* Stats grid: (Precio compra, Precio venta) | (Stock Bodega, Stock Bar) | (Total) */}
            <div className='grid grid-cols-2 gap-4 pb-4 border-b border-gray-100 dark:border-slate-800'>
              {/* Precio compra */}
              <div className='space-y-1'>
                <p className='text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider'>
                  Precio compra
                </p>
                <div className='flex items-center gap-1 text-gray-900 dark:text-neutral-100 font-bold'>
                  <span className='text-purple-500 text-xs'>$</span>
                  <span className='text-base'>
                    {formatCurrencyCLP(presentation?.precio_compra ?? product.price).replace(
                      '$',
                      ''
                    )}
                  </span>
                </div>
              </div>

              {/* Precio venta */}
              <div className='space-y-1'>
                <p className='text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider'>
                  Precio venta
                </p>
                <div className='flex items-center gap-1 text-gray-900 dark:text-neutral-100 font-bold'>
                  <span className='text-purple-500 text-xs'>$</span>
                  <span className='text-base'>
                    {presentation?.precio_venta != null
                      ? formatCurrencyCLP(presentation.precio_venta).replace('$', '')
                      : '—'}
                  </span>
                </div>
              </div>

              {/* Stock Bodega */}
              <div className='space-y-1'>
                <p className='text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider'>
                  Stock Bodega
                </p>
                <div className='flex items-center gap-1'>
                  <span className={`text-sm ${stockColorClass(stockBodega, stockMinimo)}`}>
                    {stockBodega.toLocaleString('es-CL')} un.
                  </span>
                </div>
              </div>

              {/* Stock Bar */}
              <div className='space-y-1'>
                <p className='text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider'>
                  Stock Bar
                </p>
                <p className={`text-sm ${stockColorClass(stockBar, stockMinimo)}`}>
                  {stockBar.toLocaleString('es-CL')} un.
                </p>
              </div>

              {/* Total — spans both columns, with min/max tooltip */}
              <div className='col-span-2 space-y-1'>
                <p className='text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider'>
                  Total Bar + Bodega
                </p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p
                      className={`text-sm cursor-default underline decoration-dotted decoration-gray-400 ${stockColorClass(totalStock, stockMinimo)}`}
                    >
                      {totalStock.toLocaleString('es-CL')} un.
                    </p>
                  </TooltipTrigger>
                  <TooltipPortal>
                    <TooltipContent>{tooltipMinMax}</TooltipContent>
                  </TooltipPortal>
                </Tooltip>
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
              <div className='min-h-[2.5rem]' />
            )}
          </CardContent>
        </Card>
      </StaggeredEntrance>

      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        entityLabel={presentation ? 'presentación' : 'producto'}
        entityValue={presentation ? `${product.name} · ${presentation.nombre}` : product.name}
        fieldName={presentation ? 'Presentación' : 'Producto'}
        isLoading={isLoading}
      />

      <ProductDetailsModal
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        product={product}
        presentation={presentation}
      />
    </TooltipProvider>
  );
};

export default ProductCard;
