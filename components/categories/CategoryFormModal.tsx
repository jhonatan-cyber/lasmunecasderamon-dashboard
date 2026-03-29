'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tag, FileText, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useCategoryForm } from '@/hooks/personal/useCategoryForm';

export interface CategoryFormValues {
  name: string;
  description: string;
}

interface CategoryFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isEditMode: boolean;
  initialValues?: CategoryFormValues;
  onSubmit: (data: CategoryFormValues) => Promise<void>;
  onCancel: () => void;
  isMutating: boolean;
}

export function CategoryFormModal({
  isOpen,
  onOpenChange,
  isEditMode,
  initialValues,
  onSubmit,
  onCancel,
  isMutating
}: CategoryFormModalProps) {
  const { onFormSubmit, register, errors } = useCategoryForm({
    initialValues,
    onSubmit,
    open: isOpen
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl'>
        <DialogHeader className='p-6 pb-2 border-b'>
          <DialogTitle className='text-xl font-bold flex items-center gap-2'>
            <Tag className='w-5 h-5 text-purple-600' />
            <span>{isEditMode ? 'Editar Categoría' : 'Nueva Categoría'}</span>
          </DialogTitle>
          <DialogDescription className='sr-only'>
            {isEditMode ? 'Formulario para editar categoría' : 'Formulario para crear categoría'}
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto p-6'>
          <form id='category-form' onSubmit={onFormSubmit} className='space-y-4 sm:space-y-6'>
            <div>
              <Label htmlFor='categoryName' className='text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300'>Nombre</Label>
              <div className='relative mt-1'>
                <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'>
                  <Tag className='w-4 h-4' />
                </span>
                <Input
                  id='categoryName'
                  {...register('name')}
                  placeholder='Nombre de la categoría'
                  className={`text-sm sm:text-base pl-10 rounded-full bg-gray-50/50 dark:bg-slate-900/50 border-gray-200 dark:border-gray-800 focus:ring-purple-500 ${errors.name ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.name && <span className='text-red-500 text-xs sm:text-sm mt-1'>{errors.name.message}</span>}
            </div>
            <div>
              <Label htmlFor='categoryDescription' className='text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300'>Descripción</Label>
              <div className='relative mt-1'>
                <span className='absolute left-3 top-3 text-gray-400'>
                  <FileText className='w-4 h-4' />
                </span>
                <Textarea
                  id='categoryDescription'
                  {...register('description')}
                  placeholder='Ingresa una descripción para la categoría...'
                  rows={3}
                  className='text-sm sm:text-base pl-10 rounded-2xl bg-gray-50/50 dark:bg-slate-900/50 border-gray-200 dark:border-gray-800 focus:ring-purple-500'
                />
              </div>
            </div>
          </form>
        </div>

        <div className='border-t p-4 bg-gray-50 dark:bg-slate-900/50 flex justify-center gap-3 px-6 rounded-b-2xl'>
          <Button
            variant='outline'
            onClick={onCancel}
            className='rounded-full px-6 dark:hover:bg-white dark:hover:text-black transition-all hover:scale-105'
            disabled={isMutating}
          >
            Cancelar
          </Button>
          <Button
            type='submit'
            form='category-form'
            className='bg-black text-white dark:bg-white dark:text-black dark:hover:bg-gray-200 rounded-full px-8 hover:bg-gray-800 transition-all hover:scale-105'
            disabled={isMutating}
          >
            {isMutating ? (
              <div className='flex items-center gap-2'>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span>{isEditMode ? 'Actualizando...' : 'Guardando...'}</span>
              </div>
            ) : (
              <span>{isEditMode ? 'Actualizar Cambios' : 'Guardar Categoría'}</span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
