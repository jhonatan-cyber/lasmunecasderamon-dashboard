'use client';

import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
} from '@/components/ui/dialog';
import { Banknote } from 'lucide-react';
import { AdvanceForm } from './AdvanceForm';

interface AdvancesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { usuario_id: string; monto: string; motivo: string }) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  efectivoEnCaja?: number; // Optional as it might not be ready
}

export function AdvancesDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isLoading, 
  error,
  efectivoEnCaja = 0
}: AdvancesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl'>
        <DialogHeader className='p-6 sm:p-8 pb-4 border-b bg-white dark:bg-slate-900'>
          <DialogTitle className='text-xl sm:text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white'>
            <Banknote className='w-5 h-5 sm:w-6 sm:h-6 text-emerald-500' />
            <span>Registrar Anticipo</span>
          </DialogTitle>
          <DialogDescription className='sr-only'>
            Formulario para registrar un nuevo anticipo
          </DialogDescription>
        </DialogHeader>
        
        <div className='p-6 sm:p-8 bg-white dark:bg-slate-900'>
          <AdvanceForm
            open={open}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            isLoading={isLoading}
            error={error}
            efectivoEnCaja={efectivoEnCaja}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
