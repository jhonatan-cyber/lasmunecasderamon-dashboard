'use client';

import { EmptyState } from '@/components/shared/EmptyState';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCategories, Category } from '@/hooks/products/useCategories';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import CategoryCardList from '@/components/shared/CategoryCardList';
import { useRef, useState } from 'react';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PackageCheck,
  ClipboardList,
  Search,
  X,
  AlertTriangle,
  ClipboardCheck
} from 'lucide-react';

export function ProductsPageClient() {
  const router = useRouter();
  const {
    filteredCategories,
    searchTerm,
    setSearchTerm,
    isLoading: categoriesLoading,
    reorderCategories
  } = useCategories();
  const { hasPermission } = useUserPermissions();
  const canReorder = hasPermission('categories', 'edit');
  const [savingOrder, setSavingOrder] = useState(false);
  const savingRef = useRef(false);
  const activeCategories = (filteredCategories as Category[]).filter(cat => cat.status === 1);

  const handleReorder = async (reordered: Category[]) => {
    if (!canReorder || savingRef.current || reordered.length === 0) return;
    let index = 0;
    // Conserva las categorías inactivas en sus posiciones y en la caché compartida.
    const fullOrder = filteredCategories.map(cat =>
      cat.status === 1 ? (reordered[index++] ?? cat) : cat
    );
    savingRef.current = true;
    setSavingOrder(true);
    try {
      await reorderCategories(fullOrder);
    } finally {
      savingRef.current = false;
      setSavingOrder(false);
    }
  };

  return (
    <PermissionGuard module='products' action='view'>
      <BoneyardSkeleton name='products-main' loading={categoriesLoading}>
        <div className='min-w-0 max-w-full overflow-x-clip p-4 sm:p-6 lg:p-8 space-y-6'>
          <div className='flex flex-col gap-3'>
            <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 overflow-visible'>
              <div className='shrink-0'>
                <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white'>
                  Bodega
                </h1>
                <p className='text-sm sm:text-base text-gray-600'>
                  Selecciona una categoría para ver sus productos
                </p>
              </div>
              <div className='flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center lg:justify-end'>
                <PermissionGuard module='products' action='edit'>
                  <Button
                    asChild
                    variant='outline'
                    className='flex w-full items-center justify-center gap-2 rounded-full whitespace-nowrap lg:w-auto'
                  >
                    <Link href='/products/reconciliation'>
                      <ClipboardCheck className='w-4 h-4' />
                      Conciliar stock
                    </Link>
                  </Button>
                </PermissionGuard>
                <PermissionGuard module='products' action='confirm_container_return'>
                  <Button
                    variant='outline'
                    onClick={() => router.push('/products/containers')}
                    className='flex w-full items-center justify-center gap-2 rounded-full whitespace-nowrap lg:w-auto'
                  >
                    <PackageCheck className='w-4 h-4' />
                    Envases devueltos
                  </Button>
                </PermissionGuard>
                <Button
                  asChild
                  variant='outline'
                  className='flex w-full items-center justify-center gap-2 rounded-full whitespace-nowrap lg:w-auto'
                >
                  <Link href='/products/expired'>
                    <AlertTriangle className='w-4 h-4' />
                    Lotes vencidos
                  </Link>
                </Button>
                <Button
                  asChild
                  variant='outline'
                  className='flex w-full items-center justify-center gap-2 rounded-full whitespace-nowrap lg:w-auto'
                >
                  <Link href='/purchases/replenishment'>
                    <ClipboardList className='w-4 h-4' />
                    Orden de compra
                  </Link>
                </Button>
              </div>
            </div>
            <div className='relative w-full'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none' />
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder='Buscar categoría...'
                aria-label='Buscar categoría'
                className='h-10 rounded-full pl-9 pr-10'
              />
              {searchTerm && (
                <Button
                  variant='ghost'
                  size='icon'
                  className='absolute right-0 top-0 h-10 w-10 rounded-full'
                  aria-label='Limpiar búsqueda'
                  onClick={() => setSearchTerm('')}
                >
                  <X />
                </Button>
              )}
            </div>
          </div>

          {savingOrder && (
            <p className='text-sm text-muted-foreground' role='status'>
              Guardando orden…
            </p>
          )}

          {activeCategories.length === 0 ? (
            <EmptyState
              variant='text'
              title={
                searchTerm.trim()
                  ? 'No se encontraron categorías para esa búsqueda.'
                  : 'No hay categorías activas.'
              }
            />
          ) : (
            <CategoryCardList
              variant='inventory'
              categorias={activeCategories}
              canReorder={canReorder}
              disabled={savingOrder}
              onReorder={handleReorder}
              onSelect={cat => router.push(`/products/category/${String(cat.id)}`)}
            />
          )}
        </div>
      </BoneyardSkeleton>
    </PermissionGuard>
  );
}
