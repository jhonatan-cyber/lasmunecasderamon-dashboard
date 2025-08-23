'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface DeleteCategoryConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  categoryName: string;
}

export function DeleteCategoryConfirmModal({
  open,
  onOpenChange,
  onConfirm,
  categoryName
}: DeleteCategoryConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 mb-4'>
            <AlertCircle className='text-red-500' />
            <span className='text-gray-900 dark:text-neutral-100'>Confirmar Eliminación</span>
          </DialogTitle>
          <div className='text-left'>
            <div>
              <p className='font-medium text-gray-900 dark:text-neutral-100 mb-3'>
                ¿Estás seguro de que quieres eliminar la categoría?
              </p>
              <div className='bg-red-50 dark:bg-red-950/40 p-4 rounded-lg border border-red-200 dark:border-red-800'>
                <div className='space-y-2 text-sm text-red-900 dark:text-red-100'>
                  <p>
                    <strong>Categoría:</strong> {categoryName}
                  </p>
                </div>
              </div>
              <p className='mt-3 text-sm text-red-400 dark:text-red-300 font-medium text-center'>
                Esta acción no se puede revertir. La categoría será eliminada permanentemente.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className='flex justify-center items-center gap-4 pt-4'>
          <Button
            onClick={handleCancel}
            variant='outline'
            size='sm'
            className='rounded-full px-6 hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white'
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            size='sm'
            variant='outline'
            className='rounded-full px-6 bg-black text-white hover:scale-105 transition-all duration-200'
          >
            Eliminar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
