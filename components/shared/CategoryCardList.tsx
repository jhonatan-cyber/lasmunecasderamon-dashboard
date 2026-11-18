'use client';

import { Card } from '@/components/ui/card';
import {
  Beer,
  CakeSlice,
  ChevronLeft,
  ChevronRight,
  Cigarette,
  Coffee,
  CupSoda,
  Loader2,
  Martini,
  Package,
  Package2,
  Pizza,
  Sandwich,
  Sparkles,
  Utensils,
  Wine,
  type LucideIcon
} from 'lucide-react';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { dragModifiers } from '@/components/shared/dragBounds';
import { CategoryGrid } from '@/components/categories/CategoryGrid';
import { SortableInventoryCategory } from '@/components/products/SortableInventoryCategory';
import type { Category } from '@/hooks/products/useCategories';

export interface CategoryListItem {
  id_categoria?: number;
  id?: number | string;
  nombre?: string;
  name?: string;
  description?: string;
  estado?: number;
  status?: number;
  productCount?: number;
  total_products?: number | null;
  created_at?: string;
  system_key?: string | null;
}

interface CategoryCardListBaseProps<T extends CategoryListItem = CategoryListItem> {
  categorias: T[];
  className?: string;
  loading?: boolean;
  center?: boolean;
  countLabel?: (categoria: T) => string;
}

interface CategoryCardListCatalogProps<
  T extends CategoryListItem = CategoryListItem
> extends CategoryCardListBaseProps<T> {
  variant?: 'catalog' | 'default';
  onSelect: (categoria: T) => void;
  filter?: (categoria: T) => boolean;
  icon?: React.ReactNode;
  paginate?: boolean;
  countPlacement?: 'inline' | 'top';
}

interface CategoryCardListInventoryProps<
  T extends CategoryListItem = CategoryListItem
> extends CategoryCardListBaseProps<T> {
  variant: 'inventory';
  onSelect: (categoria: T) => void;
  canReorder?: boolean;
  disabled?: boolean;
  onReorder?: (categorias: Category[]) => void;
}

interface CategoryCardListManageProps<
  T extends CategoryListItem = CategoryListItem
> extends CategoryCardListBaseProps<T> {
  variant: 'manage';
  isMutating: boolean;
  onEdit: (categoria: { id: string; name: string; description: string }) => void;
  onDelete: (id: string) => void;
  onActivate: (id: string) => void;
  onDeactivate: (id: string) => void;
  onReorder: (categorias: Category[]) => void;
}

type CategoryCardListProps<T extends CategoryListItem = CategoryListItem> =
  | CategoryCardListCatalogProps<T>
  | CategoryCardListInventoryProps<T>
  | CategoryCardListManageProps<T>;

function getCategoryIcon(categoryName: string): LucideIcon {
  const name = categoryName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (/cigarr|tabaco|cigarro/.test(name)) return Cigarette;
  if (/vino|champagne|espumante/.test(name)) return Wine;
  if (/cerveza|beer/.test(name)) return Beer;
  if (/coctel|cocktail|licor|destilad|vodka|whisky|ron|pisco|tequila/.test(name)) return Martini;
  if (/cafe|te\b|infusion/.test(name)) return Coffee;
  if (/analcohol|sin alcohol|bebida|jugos?|agua|gaseosa|energetic/.test(name)) return CupSoda;
  if (/pizza/.test(name)) return Pizza;
  if (/sandwich|hamburgues|comida rapida/.test(name)) return Sandwich;
  if (/postre|dulce|torta|pastel|helado/.test(name)) return CakeSlice;
  if (/comida|alimento|plato|entrada|picoteo/.test(name)) return Utensils;

  const fallbackIcons = [Package, Sparkles, CakeSlice, Sandwich, CupSoda];
  const hash = [...name].reduce((value, char) => value * 31 + char.charCodeAt(0), 0);
  return fallbackIcons[Math.abs(hash) % fallbackIcons.length];
}

function toCategory(categoria: CategoryListItem): Category {
  return {
    id: String(categoria.id ?? categoria.id_categoria ?? ''),
    name: categoria.name ?? categoria.nombre ?? '',
    description: categoria.description ?? '',
    status: categoria.status ?? categoria.estado ?? 1,
    total_products: categoria.total_products ?? categoria.productCount ?? undefined,
    created_at: categoria.created_at,
    system_key: categoria.system_key
  };
}

export default function CategoryCardList<T extends CategoryListItem = CategoryListItem>(
  props: CategoryCardListProps<T>
) {
  if (props.variant === 'manage') return <ManageCategoryList {...props} />;
  if (props.variant === 'inventory') return <InventoryCategoryList {...props} />;
  return <CatalogCategoryList {...props} />;
}

function ManageCategoryList<T extends CategoryListItem = CategoryListItem>({
  categorias,
  isMutating,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
  onReorder
}: CategoryCardListManageProps<T>) {
  return (
    <CategoryGrid
      categories={categorias.map(toCategory)}
      isMutating={isMutating}
      onEdit={onEdit}
      onDelete={onDelete}
      onActivate={onActivate}
      onDeactivate={onDeactivate}
      onReorder={onReorder}
    />
  );
}

function InventoryCategoryList<T extends CategoryListItem = CategoryListItem>({
  categorias,
  onSelect,
  canReorder = false,
  disabled = false,
  onReorder
}: CategoryCardListInventoryProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const categories = categorias.map(toCategory);
  const originals = new Map<string, T>(
    categorias.map((category, index) => [categories[index].id, category])
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!canReorder || !onReorder || !over || active.id === over.id) return;
    const from = categories.findIndex(category => category.id === active.id);
    const to = categories.findIndex(category => category.id === over.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(categories, from, to));
  };

  return (
    <DndContext
      modifiers={dragModifiers}
      autoScroll={false}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={categories.map(category => category.id)}
        strategy={rectSortingStrategy}
      >
        <div className='grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {categories.map(category => (
            <SortableInventoryCategory
              key={category.id}
              category={category}
              canReorder={canReorder}
              disabled={!canReorder || disabled}
              onClick={() => {
                const original = originals.get(category.id);
                if (original) onSelect(original);
              }}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function CatalogCategoryList<T extends CategoryListItem = CategoryListItem>({
  categorias = [],
  onSelect,
  center = false,
  filter,
  icon,
  className = '',
  loading = false,
  variant = 'catalog',
  countLabel,
  countPlacement = 'inline',
  paginate = true
}: CategoryCardListCatalogProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const categoriasFiltradas = filter ? categorias.filter(filter) : categorias;

  const totalPages = paginate ? Math.ceil(categoriasFiltradas.length / itemsPerPage) : 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCategorias = paginate
    ? categoriasFiltradas.slice(startIndex, endIndex)
    : categoriasFiltradas;
  const isCatalogVariant = variant === 'catalog';
  const orderAccents = [
    'bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-900',
    'bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:ring-violet-900',
    'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-900',
    'bg-cyan-100 text-cyan-700 ring-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:ring-cyan-900'
  ];

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const CategorySkeleton = () => (
    <Card className='flex flex-col items-center justify-center w-full h-28 border-dashed border-2 border-gray-200 bg-gray-50 shadow-none'>
      <Skeleton className='w-10 h-10 rounded-full mb-2' />
      <Skeleton className='h-4 w-20' />
    </Card>
  );

  return (
    <div className={`${className}`}>
      {}
      {loading && (
        <>
          <div className='flex items-center justify-center gap-2 mb-4'>
            <Loader2 className='w-4 h-4 animate-spin text-gray-400' />
            <span className='text-sm text-gray-500 dark:text-gray-400'>Cargando categorías...</span>
          </div>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-6'>
            {[...Array(8)].map((_, i) => (
              <CategorySkeleton key={i} />
            ))}
          </div>
        </>
      )}

      {}
      {!loading && currentCategorias.length > 0 && (
        <div
          className={
            isCatalogVariant
              ? 'grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] sm:gap-4'
              : 'grid grid-cols-2 gap-4 justify-center sm:grid-cols-3 sm:gap-6 lg:grid-cols-4'
          }
        >
          {currentCategorias.map((cat, index) => {
            const CategoryIcon = getCategoryIcon(cat?.nombre || cat?.name || '');
            const iconTile = (
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform duration-200 group-hover:scale-110 ${orderAccents[index % orderAccents.length]}`}
              >
                {icon || <CategoryIcon className='h-5 w-5' aria-hidden='true' />}
              </div>
            );
            const countBadge = (
              <span
                className={
                  countPlacement === 'top'
                    ? 'inline-flex min-w-0 items-center gap-1 whitespace-normal break-words rounded-full bg-neutral-100 px-2 py-1 text-right text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                    : 'inline-flex shrink-0 items-center gap-1 rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                }
              >
                <Package2 className='h-3 w-3 shrink-0' aria-hidden='true' />
                {cat?.total_products ?? cat?.productCount ?? 0}
                {countLabel ? ` ${countLabel(cat)}` : ''}
              </span>
            );
            return (
              <Card
                key={cat?.id_categoria || cat?.id || `categoria-${index}`}
                role='button'
                tabIndex={0}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(cat);
                  }
                }}
                className={
                  isCatalogVariant
                    ? 'group flex min-h-32 w-full cursor-pointer flex-col items-start justify-between overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-br from-white to-neutral-50 p-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 dark:border-neutral-800 dark:from-neutral-900 dark:to-neutral-950 dark:hover:border-rose-800 dark:focus-visible:ring-offset-neutral-950 sm:min-h-36 sm:p-4'
                    : 'flex h-28 w-full cursor-pointer flex-col items-center justify-center border-2 border-dashed border-gray-200 bg-gray-50 shadow-none transition-all duration-200 hover:scale-105 hover:border-gray-400'
                }
                onClick={() => onSelect(cat)}
              >
                {isCatalogVariant ? (
                  <>
                    {countPlacement === 'top' ? (
                      <div className='mb-4 flex w-full items-start justify-between gap-2'>
                        {iconTile}
                        {countBadge}
                      </div>
                    ) : (
                      <div className='mb-4'>{iconTile}</div>
                    )}
                    <div className='flex w-full items-end justify-between gap-2'>
                      <span className='min-w-0 break-words text-sm font-semibold leading-snug text-neutral-800 dark:text-neutral-100'>
                        {cat?.nombre || cat?.name || 'Sin nombre'}
                      </span>
                      {countPlacement === 'inline' && countBadge}
                    </div>
                  </>
                ) : (
                  <>
                    <div className='mb-2 text-3xl text-gray-600'>
                      {icon || <Wine className='h-8 w-8' />}
                    </div>
                    <div className='text-center text-sm font-semibold text-gray-700'>
                      {cat?.nombre || cat?.name || 'Sin nombre'}
                    </div>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {}
      {!loading && categoriasFiltradas.length === 0 && (
        <div className='text-center w-full py-8'>
          <div className='text-gray-500 dark:text-gray-400'>No hay categorías disponibles</div>
        </div>
      )}

      {}
      {!loading && paginate && totalPages > 1 && (
        <div className='flex justify-center items-center gap-4 mt-8'>
          <Button
            variant='outline'
            size='sm'
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className='flex items-center gap-2 rounded-full'
          >
            <ChevronLeft className='w-3 h-3' />
            Anterior
          </Button>

          <div className='flex items-center gap-2'>
            <span className='text-sm text-gray-600'>
              Página {currentPage} de {totalPages}
            </span>
          </div>

          <Button
            variant='outline'
            size='sm'
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className='flex items-center gap-2 rounded-full'
          >
            Siguiente
            <ChevronRight className='w-3 h-3' />
          </Button>
        </div>
      )}
    </div>
  );
}
