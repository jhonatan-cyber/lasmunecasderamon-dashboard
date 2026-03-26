import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tag, FileText } from 'lucide-react';
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
        <Label htmlFor='categoryName' className='text-sm sm:text-base'>Nombre</Label>
        <div className='relative'>
          <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-600'>
            <Tag className='w-3 h-3 sm:w-4 sm:h-4' />
          </span>
          <Input id='categoryName' {...register('name')} placeholder='Nombre de la categoría'
            className={`text-sm sm:text-base pl-10 sm:pl-12 ${errors.name ? 'border-red-500' : ''}`} />
        </div>
        {errors.name && <span className='text-red-500 text-xs sm:text-sm mt-1'>{errors.name.message}</span>}
      </div>
      <div>
        <Label htmlFor='categoryDescription' className='text-sm sm:text-base'>Descripción</Label>
        <div className='relative'>
          <span className='absolute left-3 top-3 text-gray-600'>
            <FileText className='w-3 h-3 sm:w-4 sm:h-4' />
          </span>
          <Textarea id='categoryDescription' {...register('description')}
            placeholder='Ingresa una descripción para la categoría...' rows={3}
            className='text-sm sm:text-base pl-10 sm:pl-12' />
        </div>
      </div>
      {!hideButtons && (
        <div className='flex flex-col sm:flex-row justify-center gap-2 sm:gap-4'>
          <Button size='sm' variant='outline' type='button' onClick={onCancel}
            className='rounded-full px-6 hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white w-full sm:w-auto'>
            Cancelar
          </Button>
          <Button onClick={onFormSubmit} disabled={isSubmitting || !isValid} size='sm' variant='outline'
            className='rounded-full px-6 bg-black text-white hover:scale-105 transition-all duration-200 w-full sm:w-auto'>
            {isSubmitting ? 'Guardando...' : initialValues ? 'Actualizar' : 'Guardar'}
          </Button>
        </div>
      )}
    </form>
  );
}
