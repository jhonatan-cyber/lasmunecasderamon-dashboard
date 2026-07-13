import Image from 'next/image';
import React, { useState } from 'react';
import { Product } from '@/types/product';
import {
  MoreVertical,
  Pencil,
  Trash,
  Check,
  Power,
  GripVertical,
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
import { DeleteProductConfirmModal } from './DeleteProductConfirmModal';
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
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onActivate: (product: Product) => void;
  onDeactivate: (product: Product) => void;
  onReorder?: (products: Product[]) => void;
  isLoading: boolean;
  isMutating: boolean;
  currentPage: number;
  pageSize: number;
}

interface SortableRowProps {
  product: Product;
  idx: number;
  currentPage: number;
  pageSize: number;
  onEdit: (product: Product) => void;
  onActivate: (product: Product) => void;
  onDeactivate: (product: Product) => void;
  handleDeleteClick: (product: Product) => void;
  isLastRow: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canActivate: boolean;
  canDeactivate: boolean;
  hasAnyAction: boolean;
}

const SortableRow: React.FC<SortableRowProps> = ({
  product,
  idx,
  currentPage,
  pageSize,
  onEdit,
  onActivate,
  onDeactivate,
  handleDeleteClick,
  isLastRow,
  canEdit,
  canDelete,
  canActivate,
  canDeactivate,
  hasAnyAction
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: product.id
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
        idx === 0 ? 'first:rounded-t-xl' : ''
      } ${isLastRow ? 'last:rounded-b-xl' : ''}`}
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
      <TableCell className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-600 font-medium'>
        <Badge className='bg-purple-100 text-purple-700 rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm'>
          {(currentPage - 1) * pageSize + idx + 1}
        </Badge>
      </TableCell>
      <TableCell className='py-3 px-2 sm:px-4 text-center'>
        <div className='relative mx-auto flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50 shadow-sm transition-all group-hover:shadow'>
          <Image
            src={
              !product.foto || product.foto === 'default.png' || product.foto === ''
                ? '/api/images/products/default.png'
                : product.foto.startsWith('http')
                  ? product.foto
                  : `/api/images/products/${product.foto}`
            }
            alt={product.name}
            width={48}
            height={48}
            sizes='48px'
            className='h-12 w-12 object-cover transition-transform duration-300 group-hover:scale-110'
          />
        </div>
      </TableCell>
      <TableCell className='py-3 px-2 sm:px-4 text-center font-mono text-xs sm:text-sm'>
        {product.code}
      </TableCell>
      <TableCell className='py-3 px-2 sm:px-4 text-center font-mono text-xs sm:text-sm'>
        {product.name}
      </TableCell>
      <TableCell className='py-3 px-2 sm:px-4 text-center font-mono text-xs sm:text-sm'>
        {formatCurrencyCLP(product.price)}
      </TableCell>
      <TableCell className='py-3 px-2 sm:px-4 text-center font-mono text-xs sm:text-sm'>
        {formatCurrencyCLP(product.commission)}
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
        {hasAnyAction && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='bg-white hover:bg-gray-200 rounded-full hover:scale-105 transition-all duration-200'
              >
                <MoreVertical className='w-3 h-3 sm:w-4 sm:h-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              {canEdit && (
                <DropdownMenuItem onClick={() => onEdit(product)} className='cursor-pointer group'>
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
        )}
      </TableCell>
    </TableRow>
  );
};

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
  pageSize
}) => {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [localProducts, setLocalProducts] = useState(products);
  const { hasPermission } = useUserPermissions();

  const canEdit = hasPermission('productos', 'editar_categoria');
  const canDelete = hasPermission('productos', 'eliminar');
  const canActivate = hasPermission('productos', 'activar');
  const canDeactivate = hasPermission('productos', 'desactivar');

  const hasAnyAction = canEdit || canDelete || canActivate || canDeactivate;

  React.useEffect(() => {
    setLocalProducts(products);
  }, [products]);

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localProducts.findIndex(p => p.id === active.id);
      const newIndex = localProducts.findIndex(p => p.id === over.id);

      const newProducts = arrayMove(localProducts, oldIndex, newIndex);
      setLocalProducts(newProducts);

      if (onReorder) {
        onReorder(newProducts);
      }
    }
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (productToDelete) {
      onDelete(productToDelete);
      setProductToDelete(null);
    }
  };

  return (
    <TooltipProvider>
      <div className='bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl border-none shadow-md overflow-hidden'>
        <div className='overflow-x-auto'>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table className='min-w-full text-base text-center'>
              <TableHeader className='bg-gray-100 dark:bg-slate-900/50'>
                <TableRow className='hover:bg-transparent border-gray-100 dark:border-gray-800'>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500 w-12'>
                    Orden
                  </TableHead>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>#</TableHead>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>Foto</TableHead>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                    Código
                  </TableHead>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                    Nombre
                  </TableHead>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                    Precio
                  </TableHead>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                    Comisión
                  </TableHead>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
                    Estado
                  </TableHead>
                  <TableHead className='py-4 px-5 text-xs uppercase text-gray-500'>
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
                  items={localProducts.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {localProducts.map((product, idx) => (
                    <SortableRow
                      key={product.id}
                      product={product}
                      idx={idx}
                      currentPage={currentPage}
                      pageSize={pageSize}
                      onEdit={onEdit}
                      onActivate={onActivate}
                      onDeactivate={onDeactivate}
                      handleDeleteClick={handleDeleteClick}
                      isLastRow={idx === localProducts.length - 1}
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

      <DeleteProductConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        productName={productToDelete?.name || ''}
        isLoading={isMutating}
      />
    </TooltipProvider>
  );
};

export default ProductTable;
