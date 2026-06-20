'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { Room } from '@/types/room';
import { Loader2 } from 'lucide-react';

interface ConfirmDeleteRoomDialogProps {
  open: boolean;
  room: Room | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (room: Room) => void;
  isLoading?: boolean;
}

export default function ConfirmDeleteRoomDialog({
  open,
  room,
  onOpenChange,
  onConfirm,
  isLoading = false
}: ConfirmDeleteRoomDialogProps) {
  if (!room) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-[420px] flex flex-col p-0 overflow-hidden rounded-2xl'>
        <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b dark:border-slate-800'>
          <DialogTitle className='flex items-center gap-2'>
            <AlertTriangle className='text-red-500 w-5 h-5' />
            <span className='text-gray-900 dark:text-neutral-100'>Confirmar Eliminación</span>
          </DialogTitle>
          <DialogDescription className='sr-only'>
            Confirmar la eliminación de la habitación
          </DialogDescription>
        </DialogHeader>
        <div className='flex-1 px-6 py-6'>
          <div className='text-left'>
            <p className='font-medium text-gray-900 dark:text-neutral-100 mb-4 text-center'>
              ¿Estás seguro de que quieres eliminar la habitación?
            </p>
            <div className='bg-red-50 dark:bg-red-950/40 p-4 rounded-xl border border-red-200 dark:border-red-800'>
              <div className='space-y-2 text-sm text-red-900 dark:text-red-100 text-center'>
                <p>
                  <strong className='opacity-70 text-xs uppercase tracking-widest block mb-1'>
                    Habitación
                  </strong>
                  <span className='text-base font-bold'>{room.name}</span>
                </p>
              </div>
            </div>
            <p className='mt-4 text-xs text-red-500 dark:text-red-400 font-medium text-center uppercase tracking-wider'>
              Esta acción no se puede revertir
            </p>
          </div>
        </div>
        <div className='border-t px-6 py-4 bg-gray-50 dark:bg-slate-900/50 flex justify-center gap-3'>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            className='rounded-full px-6 hover:bg-black hover:text-white hover:scale-105 transition-all duration-200'
          >
            Cancelar
          </Button>
          <Button
            variant='outline'
            onClick={() => {
              onConfirm(room);
            }}
            disabled={isLoading}
            className='bg-black rounded-full px-6 text-white hover:scale-105 transition-all duration-200'
          >
            {isLoading ? (
              <div className='flex items-center gap-2'>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span>Eliminando...</span>
              </div>
            ) : (
              'Eliminar'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
