 
'use client';

import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteUserConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  userName: string;
  isLoading?: boolean;
}

export function DeleteUserConfirmModal({
  open,
  onOpenChange,
  onConfirm,
  userName,
  isLoading = false,
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
      <DialogContent className='sm:max-w-[425px] flex flex-col p-0 overflow-hidden rounded-2xl'>
        <DialogHeader className='shrink-0 px-6 pt-6 pb-4 border-b dark:border-slate-800'>
          <DialogTitle className='flex items-center gap-2'>
            <AlertTriangle className='text-red-500 w-5 h-5' />
            <span className='text-gray-900 dark:text-neutral-100'>Confirmar Eliminación</span>
          </DialogTitle>
        </DialogHeader>
        <div className='flex-1 px-6 py-6'>
          <div className='text-left'>
            <p className='font-medium text-gray-900 dark:text-neutral-100 mb-4 text-center'>
              ¿Estás seguro de que quieres eliminar al usuario?
            </p>
            <div className='bg-red-50 dark:bg-red-950/40 p-4 rounded-xl border border-red-200 dark:border-red-800'>
              <div className='space-y-2 text-sm text-red-900 dark:text-red-100 text-center'>
                <p>
                  <strong className='opacity-70 text-xs uppercase tracking-widest block mb-1'>Usuario</strong>
                  <span className='text-base font-bold'>{userName}</span>
                </p>
              </div>
            </div>
            <p className='mt-4 text-xs text-red-500 dark:text-red-400 font-medium text-center uppercase tracking-wider'>
              Esta acción no se puede revertir
            </p>
          </div>
        </div>
        <div className='shrink-0 border-t px-6 py-4 bg-gray-50 dark:bg-slate-900/50 rounded-b-2xl'>
          <div className='flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4'>
            <Button
              onClick={handleCancel}
              variant='outline'
              size='sm'
              className='rounded-full hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-sm sm:text-base w-full sm:w-auto border-2'
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              className='rounded-full bg-black text-white dark:bg-black dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black dark:hover:border-white hover:scale-105 transition-all hover:bg-white hover:text-black duration-200 dark:hover:bg-gray-200 text-sm sm:text-base w-full sm:w-auto border-2'
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Eliminando...</span>
                </div>
              ) : (
                'Eliminar'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
