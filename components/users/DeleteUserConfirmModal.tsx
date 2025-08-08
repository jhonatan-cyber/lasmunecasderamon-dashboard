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

interface DeleteUserConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  userName: string;
}

export function DeleteUserConfirmModal({
  open,
  onOpenChange,
  onConfirm,
  userName
}: DeleteUserConfirmModalProps) {
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
            <span className='text-gray-900 text-base sm:text-lg'>Confirmar Eliminación</span>
          </DialogTitle>
          <div className='text-left'>
            <div className='font-medium text-gray-900 mb-3 text-sm sm:text-base'>
              ¿Estás seguro de que quieres eliminar al usuario?
            </div>
            <div className='bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200'>
              <div className='space-y-2 text-xs sm:text-sm'>
                <div>
                  <strong>Usuario:</strong> {userName}
                </div>
              </div>
            </div>
            <div className='mt-3 text-xs sm:text-sm text-red-400 font-medium text-center'>
              Esta acción no se puede revertir. El usuario será eliminado permanentemente de la
              base de datos.
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
            Eliminar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
