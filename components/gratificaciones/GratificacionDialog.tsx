'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { GratificacionesForm } from '@/components/gratificaciones/GratificacionesForm';
import type { Gratificacion } from '@/types/gratificacion';

interface GratificacionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gratificacion: Gratificacion | null;
  isLoading: boolean;
  onSubmit: (data: any) => void;
}

export function GratificacionDialog({
  open,
  onOpenChange,
  gratificacion,
  isLoading,
  onSubmit
}: GratificacionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[95vw] max-w-[95vw] sm:w-full sm:max-w-[500px] max-h-[90vh] flex flex-col p-0'>
        <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b'>
          <DialogTitle className='text-lg sm:text-xl lg:text-2xl font-bold'>
            {gratificacion ? 'Editar Gratificación' : 'Nueva Gratificación'}
          </DialogTitle>
          <DialogDescription className='sr-only'>Formulario de gratificación</DialogDescription>
        </DialogHeader>
        <div className='flex-1 overflow-y-auto px-6 py-4'>
          <GratificacionesForm
            open={open}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            isEditMode={!!gratificacion}
            gratificacion={gratificacion}
            isLoading={isLoading}
            hideButtons={true}
          />
        </div>
        <div className='flex-shrink-0 border-t px-6 py-4 bg-white dark:bg-neutral-900'>
          <div className='flex flex-col sm:flex-row justify-center gap-2 w-full'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='rounded-full px-6 hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white w-full sm:w-auto'
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type='submit'
              form='gratificaciones-form'
              variant='outline'
              size='sm'
              className='bg-black text-white rounded-full px-6 hover:scale-105 transition-all duration-200 w-full sm:w-auto'
              disabled={isLoading}
            >
              {isLoading ? 'Guardando...' : gratificacion ? 'Guardar Cambios' : 'Guardar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
