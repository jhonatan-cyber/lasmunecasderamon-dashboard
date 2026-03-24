/* eslint-disable react/no-unescaped-entities */
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

interface ConfirmDeleteRoomDialogProps {
  open: boolean;
  room: Room | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (room: Room) => void;
}

export default function ConfirmDeleteRoomDialog({
  open,
  room,
  onOpenChange,
  onConfirm
}: ConfirmDeleteRoomDialogProps) {
  if (!room) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[420px] max-h-[90vh] flex flex-col p-0'>
        <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b'>
          <DialogTitle className='flex items-center gap-2 mb-2'>
            <AlertTriangle className='text-red-500' />
            Confirmar eliminación
          </DialogTitle>
          <DialogDescription className='text-center'>
            ¿Seguro que deseas eliminar la habitación "{room.name}"? Esta acción no se puede
            deshacer.
          </DialogDescription>
        </DialogHeader>
        <div className='flex-1 overflow-y-auto px-6 py-4'>
          {/* Contenido adicional si es necesario */}
        </div>
        <div className='flex-shrink-0 border-t px-6 py-4'>
          <div className='flex justify-center gap-3'>
            <Button
              variant='outline'
              onClick={() => onOpenChange(false)}
              className='rounded-full hover:bg-black hover:text-white hover:scale-105 transition-all duration-200'
            >
              Cancelar
            </Button>
            <Button
              variant='outline'
              onClick={() => {
                onConfirm(room);
                onOpenChange(false);
              }}
              className='bg-black rounded-full text-white hover:scale-105 transition-all duration-200'
            >
              Eliminar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

