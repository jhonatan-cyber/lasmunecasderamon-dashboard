import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useRoleForm, type RoleFormValues } from '@/hooks/personal/useRoleForm';

interface RoleFormProps {
  isEditMode: boolean;
  initialValues: RoleFormValues;
  open: boolean;
  isLoading: boolean;
  onSubmit: (data: RoleFormValues) => void;
  onCancel: () => void;
  hideButtons?: boolean;
}

export function RoleForm({ isEditMode, initialValues, open, isLoading, onSubmit, onCancel, hideButtons = false }: RoleFormProps) {
  const { register, errors, onFormSubmit } = useRoleForm({ initialValues, open, onSubmit });

  return (
    <form id='role-form' onSubmit={onFormSubmit} className='space-y-4 sm:space-y-6'>
      <div>
        <Label htmlFor='role-name' className='mb-2 text-sm sm:text-base'>Nombre del Rol</Label>
        <Input id='role-name' {...register('name')} placeholder='Nombre del rol' disabled={isLoading} className='text-sm sm:text-base' />
        {errors.name && <p className='text-red-600 text-xs sm:text-sm mt-1'>{errors.name.message}</p>}
      </div>
      <div>
        <Label htmlFor='role-description' className='mb-2 text-sm sm:text-base'>Descripción</Label>
        <Textarea id='role-description' {...register('description')} placeholder='Descripción del rol' rows={3} disabled={isLoading} className='text-sm sm:text-base' />
        {errors.description && <p className='text-red-600 text-xs sm:text-sm mt-1'>{errors.description.message}</p>}
      </div>
      {!hideButtons && (
        <div className='flex flex-col sm:flex-row justify-center gap-2 w-full'>
          <Button type='button' variant='outline' size='sm' onClick={onCancel} disabled={isLoading}
            className='rounded-full px-6 hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white w-full sm:w-auto'>
            Cancelar
          </Button>
          <Button type='submit' variant='outline' size='sm' disabled={isLoading}
            className='bg-black text-white rounded-full px-6 hover:scale-105 transition-all duration-200 w-full sm:w-auto'>
            {isLoading ? 'Guardando...' : isEditMode ? 'Guardar Cambios' : 'Guardar'}
          </Button>
        </div>
      )}
    </form>
  );
}
