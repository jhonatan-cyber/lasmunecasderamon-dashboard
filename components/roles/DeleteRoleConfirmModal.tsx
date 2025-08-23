'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface DeleteRoleConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  roleName: string;
  action: 'delete' | 'deactivate';
}

export function DeleteRoleConfirmModal({
  open,
  onOpenChange,
  onConfirm,
  roleName,
  action
}: DeleteRoleConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[95vw] max-w-[95vw] sm:w-auto sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 mb-4'>
            <AlertTriangle className='text-red-500 w-4 h-4 sm:w-5 sm:h-5' />
            <span className='text-gray-900 dark:text-gray-100 text-base sm:text-lg'>
              Confirmar {action === 'delete' ? 'Eliminación' : 'Desactivación'}
            </span>
          </DialogTitle>
          <div className='text-left'>
            <div className='font-medium text-gray-900 dark:text-gray-100 mb-3 text-sm sm:text-base'>
              ¿Estás seguro de que quieres {action === 'delete' ? 'eliminar' : 'desactivar'} este rol?
            </div>
            <div className='bg-red-50 dark:bg-red-900/20 p-3 sm:p-4 rounded-lg border border-red-200 dark:border-red-800'>
              <div className='space-y-2 text-xs sm:text-sm'>
                <div className='text-gray-900 dark:text-gray-100'>
                  <strong>Rol:</strong> {roleName}
                </div>
              </div>
            </div>
            <div className='mt-3 text-xs sm:text-sm text-red-400 dark:text-red-300 font-medium text-center'>
              {action === 'delete' 
                ? 'Esta acción no se puede revertir. El rol será eliminado permanentemente de la base de datos.'
                : 'El rol será desactivado y no podrá ser utilizado por los usuarios.'
              }
            </div>
          </div>
        </DialogHeader>

        <div className='flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 pt-4'>
          <Button
            onClick={handleCancel}
            variant='outline'
            size='sm'
            className='rounded-full hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white text-sm sm:text-base w-full sm:w-auto'
          >
            Cancelar
          </Button>
                     <Button
             onClick={handleConfirm}
             size='sm'
             variant='outline'
             className='rounded-full bg-black text-white hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto'
           >
             {action === 'delete' ? 'Eliminar' : 'Desactivar'}
           </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
