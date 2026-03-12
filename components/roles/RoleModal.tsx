import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';

interface RoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditMode: boolean;
  newRole: { name: string; description: string };
  setNewRole: (role: { name: string; description: string }) => void;
  isLoading: boolean;
  onSubmit: (data: { name: string; description: string }) => void;
  onCancel: () => void;
}

export function RoleModal({
  open,
  onOpenChange,
  isEditMode,
  newRole,
  setNewRole,
  isLoading,
  onSubmit,
  onCancel
}: RoleModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm({
    defaultValues: newRole
  });

  React.useEffect(() => {
    reset(newRole);
  }, [newRole, reset]);

  // Capitalizar en tiempo real
  const capitalizeWords = (value?: string) => {
    if (!value) return '';
    return value
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const capitalizeFirst = (value?: string) => {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const watchedName = watch('name');
  const watchedDescription = watch('description');

  React.useEffect(() => {
    const cap = capitalizeWords(watchedName);
    if (watchedName !== undefined && cap !== watchedName) {
      setValue('name', cap, { shouldDirty: true, shouldValidate: true });
    }
  }, [watchedName, setValue]);

  React.useEffect(() => {
    const cap = capitalizeFirst(watchedDescription);
    if (watchedDescription !== undefined && cap !== watchedDescription) {
      setValue('description', cap, { shouldDirty: true, shouldValidate: true });
    }
  }, [watchedDescription, setValue]);

  const handleFormSubmit = (data: { name: string; description: string }) => {
    console.log('🔵 [ROLEMODAL] Formulario enviado:', data);
    // Pasar los datos directamente al padre
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[95vw] max-w-[95vw] sm:w-auto sm:max-w-[500px] max-h-[90vh] flex flex-col p-0'>
        <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b'>
          <DialogTitle className='text-lg sm:text-xl lg:text-2xl'>
            {isEditMode ? 'Editar Rol' : 'Agregar Nuevo Rol'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className='flex flex-col h-full'>
          <div className='flex-1 overflow-y-auto px-6 py-4'>
            <div className='space-y-4 sm:space-y-6'>
              <div>
                <Label htmlFor='role-name' className='mb-2 text-sm sm:text-base'>
                  Nombre del Rol
                </Label>
                <Input
                  id='role-name'
                  type='text'
                  {...register('name', {
                    required: 'El nombre es obligatorio',
                    minLength: { value: 3, message: 'Mínimo 3 caracteres' }
                  })}
                  placeholder='Nombre del rol'
                  disabled={isLoading}
                  className='text-sm sm:text-base'
                />
                {errors.name && (
                  <p className='text-red-600 text-xs sm:text-sm mt-1'>
                    {errors.name.message as string}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor='role-description' className='mb-2 text-sm sm:text-base'>
                  Descripción
                </Label>
                <Textarea
                  id='role-description'
                  {...register('description', {
                    required: 'La descripción es obligatoria',
                    minLength: { value: 5, message: 'Mínimo 5 caracteres' }
                  })}
                  placeholder='Descripción del rol'
                  rows={3}
                  disabled={isLoading}
                  className='text-sm sm:text-base'
                />
                {errors.description && (
                  <p className='text-red-600 text-xs sm:text-sm mt-1'>
                    {errors.description.message as string}
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className='flex-shrink-0 border-t px-6 py-4'>
            <div className='flex flex-col sm:flex-row justify-center gap-2 w-full'>
              <DialogClose asChild>
                <button
                  type='button'
                  className='px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 text-sm sm:text-base w-full sm:w-auto'
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  Cancelar
                </button>
              </DialogClose>
              <button
                type='submit'
                className='inline-flex items-center px-4 py-2 bg-black text-white rounded-xl hover:bg-zinc-800 transition-colors duration-200 text-sm sm:text-base w-full sm:w-auto'
                disabled={isLoading}
              >
                {isLoading
                  ? isEditMode
                    ? 'Guardando...'
                    : 'Guardando...'
                  : isEditMode
                    ? 'Guardar Cambios'
                    : 'Guardar'}
              </button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
