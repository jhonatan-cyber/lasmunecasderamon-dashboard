'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, User, FileSignature, Phone } from 'lucide-react';
import { useClientForm } from '@/hooks/personal/useClientForm';
import { type ClientFormValues } from '@/hooks/personal/useClientForm';
import { useState, useEffect } from 'react';

const formatRUT = (value: string): string => {
  const clean = value.replace(/[^0-9kK]/gi, '').toUpperCase();
  if (!clean) return '';

  if (clean.length <= 1) return clean;

  const cuerpo = clean.slice(0, -1);
  const dv = clean.slice(-1);

  const formattedCuerpo = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${formattedCuerpo}-${dv}`;
};

interface ClientFormProps {
  clientData: ClientFormValues;
  open: boolean;
  onSubmit: (data: ClientFormValues) => void;
  onCancel: () => void;
  isEditMode?: boolean;
  isLoading?: boolean;
  hideButtons?: boolean;
}

function ClientForm({
  clientData,
  open,
  onSubmit,
  onCancel,
  isEditMode = false,
  isLoading = false,
  hideButtons = false
}: ClientFormProps) {
  const { onFormSubmit, register, errors, setValue } = useClientForm({
    clientData,
    open,
    onSubmit
  });
  const [rutFormatted, setRutFormatted] = useState(clientData.run || '');

  useEffect(() => {
    if (clientData.run) {
      const formatted = formatRUT(clientData.run);
      setRutFormatted(formatted);
    } else {
      setRutFormatted('');
    }
  }, [clientData.run]);

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatRUT(value);
    setRutFormatted(formatted);
    setValue('run', formatted);
  };

  return (
    <form id='client-form' onSubmit={onFormSubmit} className='space-y-4 sm:space-y-6'>
      {/* RUT */}
      <div>
        <Label htmlFor='client-run' className='mb-2 text-sm sm:text-base'>
          RUT
        </Label>
        <span className='text-xs text-gray-500'> (Opcional)</span>
        <div className='relative'>
          <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-600'>
            <CreditCard className='w-4 h-4' />
          </span>
          <Input
            id='client-run'
            {...register('run')}
            value={rutFormatted}
            onChange={handleRutChange}
            placeholder='12.345.678-5'
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
              minLength: { value: 2, message: 'Mínimo 2 caracteres' }
            })}
            placeholder='Nombre del cliente'
            disabled={isLoading}
            className='pl-10 sm:pl-12'
          />
        </div>
        {errors.name && (
          <p className='text-red-600 text-xs mt-1'>{errors.name.message as string}</p>
        )}
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
              minLength: { value: 2, message: 'Mínimo 2 caracteres' }
            })}
            placeholder='Apellido del cliente'
            disabled={isLoading}
            className='pl-10 sm:pl-12'
          />
        </div>
        {errors.lastName && (
          <p className='text-red-600 text-xs mt-1'>{errors.lastName.message as string}</p>
        )}
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
              minLength: { value: 7, message: 'Mínimo 7 caracteres' }
            })}
            placeholder='Teléfono del cliente'
            disabled={isLoading}
            className='pl-10 sm:pl-12'
          />
        </div>
        {errors.phone && (
          <p className='text-red-600 text-xs mt-1'>{errors.phone.message as string}</p>
        )}
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

interface ClientFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isEditMode: boolean;
  clientData: { run: string; name: string; lastName: string; phone: string };
  onSubmit: (data: ClientFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

export function ClientFormModal({
  isOpen,
  onOpenChange,
  isEditMode,
  clientData,
  onSubmit,
  onCancel,
  isLoading
}: ClientFormModalProps) {
  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl'>
        <DialogHeader className='p-6 pb-2 border-b'>
          <DialogTitle className='text-xl font-bold'>
            {isEditMode ? 'Editar Cliente' : 'Nuevo Cliente'}
          </DialogTitle>
          <DialogDescription className='sr-only'>
            {isEditMode ? 'Formulario para editar cliente' : 'Formulario para crear nuevo cliente'}
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto p-6'>
          <ClientForm
            clientData={clientData}
            open={isOpen}
            onSubmit={onSubmit}
            onCancel={handleCancel}
            isEditMode={isEditMode}
            isLoading={isLoading}
            hideButtons={true}
          />
        </div>

        <div className='border-t p-4 bg-gray-50 dark:bg-slate-900/50 flex justify-center gap-3 px-6 rounded-b-2xl'>
          <Button
            variant='outline'
            onClick={handleCancel}
            className='rounded-full px-6 dark:hover:bg-white dark:hover:text-black transition-all hover:scale-105'
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type='submit'
            form='client-form'
            className='bg-black text-white dark:bg-black dark:text-white  dark:hover:!bg-white dark:hover:!text-black rounded-full px-8 hover:!bg-white hover:!text-black transition-all hover:scale-105 border-2'
            disabled={isLoading}
          >
            {isLoading ? (
              <div className='flex items-center gap-2'>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span>{isEditMode ? 'Actualizando...' : 'Guardando...'}</span>
              </div>
            ) : (
              <span>{isEditMode ? 'Actualizar ' : 'Guardar '}</span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { ClientForm };
