'use client';

import { memo } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Confirmación «¿crear el servicio y comenzar el tiempo?» antes del POST. */
export const ServicioConfirmModal = memo(function ServicioConfirmModal({
  loading,
  onCancel,
  onConfirm
}: {
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-3xl p-6 sm:p-8 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200'>
        <h3 className='text-lg sm:text-xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight'>
          Confirmar creación de servicio
        </h3>
        <p className='text-sm sm:text-base text-gray-500 mb-6 font-medium'>
          ¿Deseas crear el servicio y comenzar el tiempo?
        </p>
        <div className='flex gap-3 justify-center'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={onCancel}
            disabled={loading}
            className='px-6 py-2 text-sm font-bold rounded-full border-gray-200 h-11'
          >
            Cancelar
          </Button>
          <Button
            type='button'
            size='sm'
            onClick={onConfirm}
            disabled={loading}
            className='gap-2 bg-black text-white hover:bg-gray-800 px-8 py-2 text-sm font-black rounded-full h-11'
          >
            <ShoppingCart className='w-4 h-4' />
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
});
