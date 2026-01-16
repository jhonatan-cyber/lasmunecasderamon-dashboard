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
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { CreditCard, User, FileSignature, Phone } from 'lucide-react';

interface ClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditMode: boolean;
  clientData: { run: string; name: string; lastName: string; phone: string };
  setClientData: (data: { run: string; name: string; lastName: string; phone: string }) => void;
  isLoading: boolean;
  onSubmit: (data: { run: string; name: string; lastName: string; phone: string }) => void;
  onCancel: () => void;
}

export function ClientModal({
  open,
  onOpenChange,
  isEditMode,
  clientData,
  setClientData,
  isLoading,
  onSubmit,
  onCancel
}: ClientModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({
    defaultValues: clientData
  });

  React.useEffect(() => {
    reset(clientData);
  }, [clientData, reset, open]);

  const handleFormSubmit = (data: any) => {
    setClientData(data);
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[95vw] max-w-[95vw] sm:w-auto sm:max-w-md max-h-[90vh] flex flex-col p-0'>
        <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b'>
          <DialogTitle className='text-lg sm:text-xl'>
            {isEditMode ? 'Editar Cliente' : 'Agregar Nuevo Cliente'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className='flex flex-col h-full'>
          <div className='flex-1 overflow-y-auto px-6 py-4'>
            <div className='space-y-4 sm:space-y-6'>
              <div>
                <Label htmlFor='client-run' className='mb-2 text-sm sm:text-base'>
                  RUN
                </Label>
                <span className='text-xs text-gray-500'> (Opcional)</span>
                <div className='relative'>
                  <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600'>
                    <CreditCard className='w-3 h-3 sm:w-4 sm:h-4' />
                  </span>
                  <Input
                    id='client-run'
                    type='text'
                    {...register('run', {
                      minLength: { value: 6, message: 'Mínimo 6 caracteres' }
                    })}
                    placeholder='RUN del cliente'
                    disabled={isLoading}
                    className='pl-10 sm:pl-12 text-sm sm:text-base'
                  />
                </div>
                {errors.run && (
                  <p className='text-red-600 text-xs mt-1'>{errors.run.message as string}</p>
                )}
              </div>
              <div>
                <Label htmlFor='client-name' className='mb-2 text-sm sm:text-base'>
                  Nombre
                </Label>
                <span className='text-xs text-red-500'> *</span>
                <div className='relative'>
                  <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600'>
                    <User className='w-3 h-3 sm:w-4 sm:h-4' />
                  </span>
                  <Input
                    id='client-name'
                    type='text'
                    {...register('name', {
                      required: 'El nombre es obligatorio',
                      minLength: { value: 2, message: 'Mínimo 2 caracteres' }
                    })}
                    placeholder='Nombre del cliente'
                    disabled={isLoading}
                    className='pl-10 sm:pl-12 text-sm sm:text-base'
                  />
                </div>
                {errors.name && (
                  <p className='text-red-600 text-xs mt-1'>{errors.name.message as string}</p>
                )}
              </div>
              <div>
                <Label htmlFor='client-lastName' className='mb-2 text-sm sm:text-base'>
                  Apellido
                </Label>
                <span className='text-xs text-red-500'> *</span>
                <div className='relative'>
                  <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600'>
                    <FileSignature className='w-3 h-3 sm:w-4 sm:h-4' />
                  </span>
                  <Input
                    id='client-lastName'
                    type='text'
                    {...register('lastName', {
                      required: 'El apellido es obligatorio',
                      minLength: { value: 2, message: 'Mínimo 2 caracteres' }
                    })}
                    placeholder='Apellido del cliente'
                    disabled={isLoading}
                    className='pl-10 sm:pl-12 text-sm sm:text-base'
                  />
                </div>
                {errors.lastName && (
                  <p className='text-red-600 text-xs mt-1'>{errors.lastName.message as string}</p>
                )}
              </div>
              <div>
                <Label htmlFor='client-phone' className='mb-2 text-sm sm:text-base'>
                  Teléfono
                </Label>
                <span className='text-xs text-gray-500'> (Opcional)</span>
                <div className='relative'>
                  <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600'>
                    <Phone className='w-3 h-3 sm:w-4 sm:h-4' />
                  </span>
                  <Input
                    id='client-phone'
                    type='text'
                    {...register('phone', {
                      minLength: { value: 7, message: 'Mínimo 7 caracteres' }
                    })}
                    placeholder='Teléfono del cliente'
                    disabled={isLoading}
                    className='pl-10 sm:pl-12 text-sm sm:text-base'
                  />
                </div>
                {errors.phone && (
                  <p className='text-red-600 text-xs mt-1'>{errors.phone.message as string}</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className='flex-shrink-0 border-t px-6 py-4'>
            <div className='flex flex-col sm:flex-row justify-center gap-2 w-full'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='rounded-full hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white text-sm sm:text-base w-full sm:w-auto px-4 sm:px-6 py-2'
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type='submit'
                size='sm'
                variant='outline'
                className='bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto px-4 sm:px-6 py-2'
                disabled={isLoading}
              >
                {isLoading ? 'Guardando...' : isEditMode ? 'Actualizar' : 'Guardar'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
