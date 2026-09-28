'use client';

import React, { useState } from 'react';
import { Product, Presentacion } from '@/types/product';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import {
  MoreVertical,
  Pencil,
  Trash,
  Check,
  Power,
  GripVertical,
  Eye,
  Image as ImageIcon
} from 'lucide-react';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { DeleteConfirmModal } from '@/components/shared/DeleteConfirmModal';
import { ProductDetailsModal } from './ProductDetailsModal';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product, presentation: Presentacion | null) => void;
  onDelete: (product: Product) => void;
  onActivate: (product: Product) => void;
  onDeactivate: (product: Product) => void;
  onReorder?: (products: Product[]) => void;
  isLoading: boolean;
  isMutating: boolean;
  currentPage: number;
  pageSize: number;
  presentacionesPorProducto?: Record<string, Presentacion[]>;
}

interface FlatRow {
  rowId: string;
  product: Product;
  presentation: Presentacion | null;
}

interface SortableRowProps {
  row: FlatRow;
  onEdit: (product: Product, presentation: Presentacion | null) => void;
  onActivate: (product: Product) => void;
  onDeactivate: (product: Product) => void;
  handleDeleteClick: (product: Product) => void;
  onViewDetails: (product: Product, presentation: Presentacion | null) => void;
  isLastRow: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canActivate: boolean;
  canDeactivate: boolean;
  hasAnyAction: boolean;
}

function productFoto(foto?: string | null): string {
  if (!foto || foto === 'default.png' || foto === '') return '/api/images/products/default.png';
  if (foto.startsWith('http')) return foto;
  return `/api/images/products/${foto}`;
}

const SortableRow: React.FC<SortableRowProps> = React.memo(
  ({
    row,
    onEdit,
    onActivate,
    onDeactivate,
    handleDeleteClick,
    onViewDetails,
    isLastRow,
    canEdit,
    canDelete,
    canActivate,
    canDeactivate,
    hasAnyAction
  }) => {
    const { product, presentation } = row;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: row.rowId
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1
    };

    return (
      <TableRow
        ref={setNodeRef}
        style={style}
        className={`border-b bg-white group hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors ${
          isLastRow ? 'last:rounded-b-xl' : ''
        }`}
      >
        <TableCell className='py-3 px-2 sm:px-4 text-center'>
          <div
            {...attributes}
            {...listeners}
            className='cursor-grab active:cursor-grabbing inline-flex items-center justify-center hover:bg-gray-100 rounded p-1'
          >
            <GripVertical className='w-4 h-4 text-gray-400' />
          </div>
        </TableCell>
        <TableCell className='py-3 px-2 sm:px-4 text-center'>
          <div
            data-photo-surface
            className='relative mx-auto flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/40 shadow-xs transition-all group-hover:shadow-sm'
          >
            <ProductPhoto
              src={productFoto(presentation?.foto || product.foto)}
              alt={presentation ? `${product.name} ${presentation.nombre}` : product.name}
              width={48}
              height={48}
              className='h-12 w-12 object-cover transition-transform duration-300 group-hover:scale-110'
            />
          </div>
        </TableCell>
        <TableCell className='py-3 px-2 sm:px-4 text-center font-mono text-xs sm:text-sm'>
          {presentation?.codigo_barras || product.code}
        </TableCell>
        <TableCell className='py-3 px-2 sm:px-4 text-center font-mono text-xs sm:text-sm'>
          {product.name}
        </TableCell>
        <TableCell className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm'>
          {presentation ? (
            <span className='inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-slate-800 px-2.5 py-0.5 font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap'>
              {presentation.nombre}
            </span>
          ) : (
            <span className='text-gray-300'>—</span>
          )}
        </TableCell>
        <TableCell className='py-3 px-2 sm:px-4 text-center font-mono text-xs sm:text-sm'>
          {formatCurrencyCLP(presentation?.precio_compra ?? product.price)}
        </TableCell>
        <TableCell className='py-3 px-2 sm:px-4 text-center font-mono text-xs sm:text-sm'>
          <Badge className='bg-blue-100 text-blue-700 rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm'>
            {presentation ? (presentation.stock ?? 0) : (product.stock_almacen ?? 0)}
          </Badge>
        </TableCell>
        <TableCell className='py-3 px-2 sm:px-4 text-center font-mono'>
          {product.status === 1 ? (
            <Badge className='bg-green-100 text-green-700 rounded-full px-2 sm:px-3 py-1 font-mono text-xs sm:text-sm'>
              Activo
            </Badge>
          ) : (
            <Badge className='bg-red-200 text-red-600 rounded-full px-2 sm:px-3 py-1 font-mono text-xs sm:text-sm'>
              Inactivo
            </Badge>
          )}
        </TableCell>
        <TableCell className='py-3 px-2 sm:px-4 text-center font-mono'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                aria-label='Más acciones'
                className='bg-white hover:bg-gray-200 rounded-full hover:scale-105 transition-all duration-200'
              >
                <MoreVertical className='w-3 h-3 sm:w-4 sm:h-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem
                onClick={() => onViewDetails(product, presentation)}
                className='cursor-pointer group'
              >
                <Eye className='mr-2 text-blue-600 group-hover:text-blue-700 transition-colors' />
                <span className='group-hover:text-blue-700 transition-colors'>Detalles</span>
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem
                  onClick={() => onEdit(product, presentation)}
                  className='cursor-pointer group'
                >
                  <Pencil className='mr-2 text-purple-600 group-hover:text-purple-700 transition-colors' />
                  <span className='group-hover:text-purple-700 transition-colors'>Editar</span>
                </DropdownMenuItem>
              )}
              {product.status === 1 && canDeactivate ? (
                <DropdownMenuItem
                  onClick={() => onDeactivate(product)}
                  className='cursor-pointer group'
                >
                  <Power className='mr-2 text-orange-600 group-hover:text-orange-700 transition-colors' />
                  <span className='group-hover:text-orange-700 transition-colors'>Desactivar</span>
                </DropdownMenuItem>
              ) : product.status === 0 && canActivate ? (
                <DropdownMenuItem
                  onClick={() => onActivate(product)}
                  className='cursor-pointer group'
                >
                  <Check className='mr-2 text-green-600 group-hover:text-green-700 transition-colors' />
                  <span className='group-hover:text-green-700 transition-colors'>Activar</span>
                </DropdownMenuItem>
              ) : null}
              {canDelete && (
                <DropdownMenuItem
                  onClick={() => handleDeleteClick(product)}
                  className='cursor-pointer group'
                >
                  <Trash className='mr-2 text-red-600 group-hover:text-red-700 transition-colors' />
                  <span className='group-hover:text-red-700 transition-colors'>Eliminar</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    );
  }
);
SortableRow.displayName = 'SortableRow';

const ProductTable: React.FC<ProductTableProps> = ({
  products,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
  onReorder,
  isLoading,
  isMutating,
  currentPage,
  pageSize,
  presentacionesPorProducto = {}
}) => {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [detailsProduct, setDetailsProduct] = useState<Product | null>(null);
  const [detailsPresentation, setDetailsPresentation] = useState<Presentacion | null>(null);
  const openDetails = React.useCallback((product: Product, presentation: Presentacion | null) => {
    setDetailsProduct(product);
    setDetailsPresentation(presentation);
  }, []);
  const [localProducts, setLocalProducts] = useState(products);
  const { hasPermission } = useUserPermissions();

  const canEdit = hasPermission('products', 'edit');
  const canDelete = hasPermission('products', 'delete');
  const canActivate = hasPermission('products', 'activate');
  const canDeactivate = hasPermission('products', 'deactivate');

  const hasAnyAction = canEdit || canDelete || canActivate || canDeactivate;

  React.useEffect(() => {
    const prodIds = products.map(p => p.id).join(',');
    const localIds = localProducts.map(p => p.id).join(',');
    if (prodIds !== localIds) {
      setLocalProducts(products);
    }
  }, [products, localProducts]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const rowIdToProductId = (rowId: string | number) => String(rowId).split('::')[0];

  const flatRows: FlatRow[] = React.useMemo(
    () =>
      localProducts.flatMap(product => {
        const pres = presentacionesPorProducto[String(product.id)] ?? [];
        if (pres.length === 0) {
          return [
            {
              rowId: String(product.id),
              product,
              presentation: null
            } as FlatRow
          ];
        }
        return pres.map(
          p =>
            ({
              rowId: `${product.id}::${p.id}`,
              product,
              presentation: p
            }) as FlatRow
        );
      }),
    [localProducts, presentacionesPorProducto]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const activeProductId = rowIdToProductId(active.id);
      const overProductId = rowIdToProductId(over.id);
      if (activeProductId === overProductId) return;
      const oldIndex = localProducts.findIndex(p => String(p.id) === activeProductId);
      const newIndex = localProducts.findIndex(p => String(p.id) === overProductId);
      if (oldIndex === -1 || newIndex === -1) return;

      const newProducts = arrayMove(localProducts, oldIndex, newIndex);
      setLocalProducts(newProducts);

      if (onReorder) {
        onReorder(newProducts);
      }
    }
  };

  const handleDeleteClick = React.useCallback((product: Product) => {
    setProductToDelete(product);
    setDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = React.useCallback(() => {
    if (productToDelete) {
      onDelete(productToDelete);
      setProductToDelete(null);
    }
  }, [productToDelete, onDelete]);

  return (
    <TooltipProvider>
      <div className='bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl border-none shadow-md overflow-hidden'>
        <div className='overflow-x-auto'>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table className='min-w-full text-base text-center'>
              <TableHeader className='bg-gray-100 dark:bg-slate-900/50'>
                <TableRow className='hover:bg-transparent border-gray-100 dark:border-gray-800'>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center w-12'>
                    Orden
                  </TableHead>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>
                    Foto
                  </TableHead>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>
                    Código
                  </TableHead>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>
                    Nombre
                  </TableHead>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>
                    Presentación
                  </TableHead>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>
                    Precio compra
                  </TableHead>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>
                    Stock
                  </TableHead>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>
                    Estado
                  </TableHead>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 text-center'>
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localProducts.length === 0 && (
                  <TableRow key='empty'>
                    <TableCell
                      colSpan={9}
                      className='text-center py-8 text-gray-400 bg-white text-sm sm:text-base'
                    >
                      No hay productos
                    </TableCell>
                  </TableRow>
                )}
                <SortableContext
                  items={flatRows.map(r => r.rowId)}
                  strategy={verticalListSortingStrategy}
                >
                  {flatRows.map((row, flatIdx) => (
                    <SortableRow
                      key={row.rowId}
                      row={row}
                      onEdit={onEdit}
                      onActivate={onActivate}
                      onDeactivate={onDeactivate}
                      handleDeleteClick={handleDeleteClick}
                      onViewDetails={openDetails}
                      isLastRow={flatIdx === flatRows.length - 1}
                      canEdit={canEdit}
                      canDelete={canDelete}
                      canActivate={canActivate}
                      canDeactivate={canDeactivate}
                      hasAnyAction={hasAnyAction}
                    />
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </DndContext>
        </div>
      </div>

      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        entityLabel='producto'
        entityValue={productToDelete?.name || ''}
        fieldName='Producto'
        isLoading={isMutating}
      />

      <ProductDetailsModal
        open={detailsProduct !== null}
        onOpenChange={v => {
          if (!v) {
            setDetailsProduct(null);
            setDetailsPresentation(null);
          }
        }}
        product={detailsProduct}
        presentation={detailsPresentation}
      />
    </TooltipProvider>
  );
};

export default ProductTable;
