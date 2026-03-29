'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

interface CategoryHeaderProps {
  onCreateClick: () => void;
}

export function CategoryHeader({ onCreateClick }: CategoryHeaderProps) {
  return (
    <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6'>
      <div>
        <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900'>Categorías</h1>
        <p className='text-sm sm:text-base text-gray-600'>Organiza tus productos en categorías</p>
      </div>
      <PermissionGuard module='categories' action='create' fallback={null}>
        <Button
          variant='outline'
          className='flex items-center gap-2 rounded-full bg-black text-white dark:bg-white dark:text-black hover:scale-105 transition-all duration-200 text-sm sm:text-base px-6 py-2 w-full sm:w-auto dark:hover:bg-gray-200'
          type='button'
          onClick={onCreateClick}
        >
          <Plus className='w-4 h-4' />
          Nueva Categoría
        </Button>
      </PermissionGuard>
    </div>
  );
}
