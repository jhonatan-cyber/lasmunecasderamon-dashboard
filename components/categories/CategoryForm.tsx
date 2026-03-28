import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tag, FileText, Loader2 } from 'lucide-react';
import { useCategoryForm } from '@/hooks/personal/useCategoryForm';

export interface CategoryFormValues {
  name: string;
  description: string;
}

interface CategoryFormProps {
  open: boolean;
  onSubmit: (data: CategoryFormValues) => Promise<void>;
  onCancel: () => void;
  initialValues?: CategoryFormValues;
  hideButtons?: boolean;
}

export function CategoryForm({ open, onSubmit, onCancel, initialValues, hideButtons = false }: CategoryFormProps) {
  const { onFormSubmit, register, errors, isSubmitting, isValid } = useCategoryForm({
    initialValues,
    onSubmit,
    open,
  });

  return (
    <form id='category-form' onSubmit={onFormSubmit} className='space-y-4 sm:space-y-6'>
      <div>
        <Label htmlFor='categoryName' className='text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300'>Nombre</Label>
        <div className='relative mt-1'>
          <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'>
            <Tag className='w-4 h-4' />
          </span>
          <Input id='categoryName' {...register('name')} placeholder='Nombre de la categoría'
            className={`text-sm sm:text-base pl-10 rounded-full bg-gray-50/50 dark:bg-slate-900/50 border-gray-200 dark:border-gray-800 focus:ring-purple-500 ${errors.name ? 'border-red-500' : ''}`} />
        </div>
        {errors.name && <span className='text-red-500 text-xs sm:text-sm mt-1'>{errors.name.message}</span>}
      </div>
      <div>
        <Label htmlFor='categoryDescription' className='text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300'>Descripción</Label>
        <div className='relative mt-1'>
          <span className='absolute left-3 top-3 text-gray-400'>
            <FileText className='w-4 h-4' />
          </span>
          <Textarea id='categoryDescription' {...register('description')}
            placeholder='Ingresa una descripción para la categoría...' rows={3}
            className='text-sm sm:text-base pl-10 rounded-2xl bg-gray-50/50 dark:bg-slate-900/50 border-gray-200 dark:border-gray-800 focus:ring-purple-500' />
        </div>
      </div>
      {!hideButtons && (
        <div className='flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 w-full'>
          <Button 
            type='button' 
            variant='outline' 
            onClick={onCancel}
            className='flex items-center gap-2 rounded-full px-6 hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black w-full sm:w-auto text-sm sm:text-base'
          >
            Cancelar
          </Button>
          <Button 
            type='submit' 
            variant='outline'
            className='flex items-center bg-black text-white dark:bg-white dark:text-black gap-2 rounded-full px-6 hover:scale-105 transition-all duration-200 w-full sm:w-auto dark:hover:bg-gray-200 text-sm sm:text-base'
            disabled={isSubmitting || !isValid}
          >
            {isSubmitting ? (
              <div className='flex items-center gap-2'>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span>Guardando...</span>
              </div>
            ) : initialValues ? (
              'Actualizar'
            ) : (
              'Guardar'
            )}
          </Button>
        </div>
      )}
    </form>
  );
}
