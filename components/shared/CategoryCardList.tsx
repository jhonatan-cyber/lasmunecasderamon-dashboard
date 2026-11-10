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

interface Category {
  id_categoria?: number;
  id?: number;
  nombre?: string;
  name?: string;
  estado?: number;
  productCount?: number;
  total_products?: number;
}

interface CategoryCardListProps {
  categorias: Category[];
  onSelect: (categoria: Category) => void;
  center?: boolean;
  filter?: (categoria: Category) => boolean;
  icon?: React.ReactNode;
  className?: string;
  loading?: boolean;
  variant?: 'default' | 'catalog';
}

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

const CategoryCardList: React.FC<CategoryCardListProps> = ({
  categorias = [],
  onSelect,
  center = false,
  filter,
  icon,
  className = '',
  loading = false,
  variant = 'catalog'
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const categoriasFiltradas = filter ? categorias.filter(filter) : categorias;

  const totalPages = Math.ceil(categoriasFiltradas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCategorias = categoriasFiltradas.slice(startIndex, endIndex);
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
                    <div
                      className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ring-1 transition-transform duration-200 group-hover:scale-110 ${orderAccents[index % orderAccents.length]}`}
                    >
                      {icon || <CategoryIcon className='h-5 w-5' aria-hidden='true' />}
                    </div>
                    <div className='flex w-full items-end justify-between gap-2'>
                      <span className='min-w-0 break-words text-sm font-semibold leading-snug text-neutral-800 dark:text-neutral-100'>
                        {cat?.nombre || cat?.name || 'Sin nombre'}
                      </span>
                      <span className='inline-flex shrink-0 items-center gap-1 rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'>
                        <Package2 className='h-3 w-3' aria-hidden='true' />
                        {cat?.total_products ?? cat?.productCount ?? 0}
                      </span>
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
      {!loading && totalPages > 1 && (
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
};

export default CategoryCardList;
