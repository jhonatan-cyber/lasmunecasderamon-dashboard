'use client';

import { useRouter } from 'next/navigation';
import { useCategories, Category } from '@/hooks/productos/useCategories';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import CategoryCard from '@/components/products/CategoryCard';
import { Button } from '@/components/ui/button';
import { PackageCheck } from 'lucide-react';

export function ProductsPageClient() {
  const router = useRouter();
  const { filteredCategories, isLoading: categoriesLoading } = useCategories();
  const activeCategories = (filteredCategories as Category[]).filter(cat => cat.status === 1);

  return (
    <PermissionGuard module='products' action='view'>
      <BoneyardSkeleton name='products-main' loading={categoriesLoading}>
        <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
            <div>
              <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white'>
                Almacén
              </h1>
              <p className='text-sm sm:text-base text-gray-600'>
                Selecciona una categoría para ver sus productos
              </p>
            </div>
            <PermissionGuard module='products' action='confirm_container_return'>
              <Button
                variant='outline'
                onClick={() => router.push('/products/containers')}
                className='rounded-full flex items-center gap-2 self-start sm:self-auto'
              >
                <PackageCheck className='w-4 h-4' />
                Envases devueltos
              </Button>
            </PermissionGuard>
          </div>

          {activeCategories.length === 0 ? (
            <div className='text-center text-gray-500 text-sm sm:text-base'>
              No hay categorías activas.
            </div>
          ) : (
            <div className='grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
              {activeCategories.map(cat => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  onClick={() => router.push(`/products/category/${cat.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </BoneyardSkeleton>
    </PermissionGuard>
  );
}
