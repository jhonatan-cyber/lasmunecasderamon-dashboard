'use client';

import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
} from '@/components/ui/dialog';
import { Loader2, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdvanceForm } from './AdvanceForm';

interface AdvancesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { usuario_id: string; monto: string; motivo: string }) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  efectivoEnCaja?: number;
}

export function AdvancesDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isLoading, 
  error,
  efectivoEnCaja = 0
}: AdvancesDialogProps) {
  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl'>
        <DialogHeader className='p-6 pb-2 border-b'>
          <DialogTitle className='text-xl font-bold flex items-center gap-2'>
            <Banknote className='w-5 h-5 sm:w-6 sm:h-6 text-emerald-500' />
            <span>Registrar Anticipo</span>
          </DialogTitle>
          <DialogDescription className='sr-only'>
            Formulario para registrar un nuevo anticipo
          </DialogDescription>
        </DialogHeader>
        
        <div className='flex-1 overflow-y-auto p-6'>
          <AdvanceForm
            open={open}
            onSubmit={onSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
            error={error}
            efectivoEnCaja={efectivoEnCaja}
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
            form='advance-form'
            className='bg-black text-white dark:bg-white dark:text-black dark:hover:bg-gray-200! dark:hover:text-black! rounded-full px-8 hover:bg-gray-800! hover:text-white! transition-all hover:scale-105 border-2'
            disabled={isLoading}
          >
            {isLoading ? (
              <div className='flex items-center gap-2'>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span>Guardando...</span>
              </div>
            ) : (
              <span>Guardar</span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}