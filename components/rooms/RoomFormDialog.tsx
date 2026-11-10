'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { RoomForm } from './RoomForm';
import { Room } from '@/types/room';
import { RoomFormValues } from '@/hooks/rooms';

interface RoomFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: RoomFormValues) => void;
  room: Room | null;
  isMutating: boolean;
}

export function RoomFormDialog({ open, onClose, onSubmit, room, isMutating }: RoomFormDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        if (!v) onClose();
      }}
    >
      <DialogContent className='max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl'>
        <DialogHeader className='p-4 pb-2 pr-12 border-b sm:p-6 sm:pb-2 sm:pr-14'>
          <DialogTitle className='text-lg font-bold sm:text-xl'>
            {room ? 'Editar Habitación' : 'Nueva Habitación'}
          </DialogTitle>
          <DialogDescription className='sr-only'>
            Formulario para crear o editar habitaciones
          </DialogDescription>
        </DialogHeader>

        <div className='min-h-0 flex-1 overflow-y-auto p-4 sm:p-6'>
          <RoomForm
            open={open}
            onCancel={onClose}
            onSubmit={onSubmit}
            initialValues={room}
            isLoading={isMutating}
            hideButtons={true}
          />
        </div>

        <div className='border-t bg-gray-50 p-4 dark:bg-slate-900/50 flex justify-center gap-3 rounded-b-2xl sm:p-6'>
          <Button
            variant='outline'
            onClick={onClose}
            className='rounded-full px-6 dark:hover:bg-white dark:hover:text-black transition-all hover:scale-105'
            disabled={isMutating}
          >
            Cancelar
          </Button>
          <Button
            type='submit'
            form='room-form'
            className='bg-black text-white dark:bg-white dark:text-black dark:hover:bg-gray-200 rounded-full px-8 hover:bg-gray-800 transition-all hover:scale-105'
            disabled={isMutating}
          >
            {isMutating ? (
              <div className='flex items-center gap-2'>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span>{room ? 'Actualizando...' : 'Guardando...'}</span>
              </div>
            ) : (
              <span>{room ? 'Actualizar' : 'Guardar'}</span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
