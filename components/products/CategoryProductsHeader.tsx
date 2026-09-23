'use client';

import { Button } from '@/components/ui/button';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { Plus, ArrowLeft } from 'lucide-react';

interface CategoryProductsHeaderProps {
  categoryName?: string;
  onBack: () => void;
  onNewProduct: () => void;
}

export function CategoryProductsHeader({
  categoryName,
  onBack,
  onNewProduct
}: CategoryProductsHeaderProps) {
  return (
    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
      <div className='flex flex-col'>
        <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900'>
          Productos: {categoryName}
        </h1>
        <p className='text-sm sm:text-base text-gray-600'>Gestión de productos de la categoría.</p>
      </div>

      <div className='flex flex-col sm:flex-row gap-2 items-center w-full sm:w-auto'>
        <Button
          variant='outline'
          className='rounded-full px-6 dark:hover:bg-white dark:hover:text-black transition-all hover:scale-105 w-full sm:w-auto'
          onClick={onBack}
        >
          <ArrowLeft className='w-4 h-4 mr-1' />
          Atrás
        </Button>
        <PermissionGuard module='products' action='create' fallback={null}>
          <Button
            className='bg-black text-white rounded-full px-6 py-2 hover:bg-white hover:text-black hover:scale-105 transition-all duration-200 border-2 dark:bg-black dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black dark:hover:border-white w-full sm:w-auto'
            onClick={onNewProduct}
          >
            <Plus className='w-4 h-4 mr-1' />
            Nuevo producto
          </Button>
        </PermissionGuard>
      </div>
    </div>
  );
}
