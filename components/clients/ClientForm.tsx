import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CreditCard, User, FileSignature, Phone } from 'lucide-react';
import { useClientForm } from '@/hooks/personal/useClientForm';
import type { ClientFormValues } from '@/hooks/personal/useClientForm';

interface ClientFormProps {
  clientData: ClientFormValues;
  open: boolean;
  onSubmit: (data: ClientFormValues) => void;
  onCancel: () => void;
  isEditMode?: boolean;
  isLoading?: boolean;
  hideButtons?: boolean;
}

export function ClientForm({
  clientData,
  open,
  onSubmit,
  onCancel,
  isEditMode = false,
  isLoading = false,
  hideButtons = false,
}: ClientFormProps) {
  const { onFormSubmit, register, errors } = useClientForm({ clientData, open, onSubmit });

  return (
    <form id='client-form' onSubmit={onFormSubmit} className='space-y-4 sm:space-y-6'>
      {/* RUN */}
      <div>
        <Label htmlFor='client-run' className='mb-2 text-sm sm:text-base'>
          RUN
        </Label>
        <span className='text-xs text-gray-500'> (Opcional)</span>
        <div className='relative'>
          <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-600'>
            <CreditCard className='w-4 h-4' />
          </span>
          <Input
            id='client-run'
            {...register('run')}
            placeholder='RUN del cliente'
            disabled={isLoading}
            className='pl-10 sm:pl-12'
          />
        </div>
        {errors.run && <p className='text-red-600 text-xs mt-1'>{errors.run.message as string}</p>}
      </div>

      {/* Nombre */}
      <div>
        <Label htmlFor='client-name' className='mb-2 text-sm sm:text-base'>
          Nombre
        </Label>
        <span className='text-xs text-red-500'> *</span>
        <div className='relative'>
          <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-600'>
            <User className='w-4 h-4' />
          </span>
          <Input
            id='client-name'
            {...register('name', {
              required: 'El nombre es obligatorio',
              minLength: { value: 2, message: 'Mínimo 2 caracteres' },
            })}
            placeholder='Nombre del cliente'
            disabled={isLoading}
            className='pl-10 sm:pl-12'
          />
        </div>
        {errors.name && <p className='text-red-600 text-xs mt-1'>{errors.name.message as string}</p>}
      </div>

      {/* Apellido */}
      <div>
        <Label htmlFor='client-lastName' className='mb-2 text-sm sm:text-base'>
          Apellido
        </Label>
        <span className='text-xs text-red-500'> *</span>
        <div className='relative'>
          <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-600'>
            <FileSignature className='w-4 h-4' />
          </span>
          <Input
            id='client-lastName'
            {...register('lastName', {
              required: 'El apellido es obligatorio',
              minLength: { value: 2, message: 'Mínimo 2 caracteres' },
            })}
            placeholder='Apellido del cliente'
            disabled={isLoading}
            className='pl-10 sm:pl-12'
          />
        </div>
        {errors.lastName && <p className='text-red-600 text-xs mt-1'>{errors.lastName.message as string}</p>}
      </div>

      {/* Teléfono */}
      <div>
        <Label htmlFor='client-phone' className='mb-2 text-sm sm:text-base'>
          Teléfono
        </Label>
        <span className='text-xs text-gray-500'> (Opcional)</span>
        <div className='relative'>
          <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-600'>
            <Phone className='w-4 h-4' />
          </span>
          <Input
            id='client-phone'
            {...register('phone', {
              minLength: { value: 7, message: 'Mínimo 7 caracteres' },
            })}
            placeholder='Teléfono del cliente'
            disabled={isLoading}
            className='pl-10 sm:pl-12'
          />
        </div>
        {errors.phone && <p className='text-red-600 text-xs mt-1'>{errors.phone.message as string}</p>}
      </div>

      {!hideButtons && (
        <div className='flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 w-full'>
          <Button
            type='button'
            variant='outline'
            className='flex items-center gap-2 rounded-full hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black w-full sm:w-auto px-6 py-2 text-sm sm:text-base'
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type='submit'
            variant='outline'
            className='flex items-center bg-black text-white dark:bg-white dark:text-black gap-2 rounded-full hover:scale-105 transition-all duration-200 w-full sm:w-auto px-6 py-2 dark:hover:bg-gray-200 text-sm sm:text-base'
            disabled={isLoading}
          >
            {isLoading ? 'Guardando...' : isEditMode ? 'Actualizar' : 'Guardar'}
          </Button>
        </div>
      )}
    </form>
  );
}
