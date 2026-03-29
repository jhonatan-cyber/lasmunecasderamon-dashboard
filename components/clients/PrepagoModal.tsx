'use client';

import { Wallet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Client } from '@/types/client';
import { User, CreditCard } from 'lucide-react';

interface PrepagoFormProps {
  client: Client | null;
  amount: string;
  onAmountChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  hideButtons?: boolean;
}

function PrepagoForm({ 
  client, 
  amount, 
  onAmountChange, 
  onSubmit, 
  onCancel, 
  isSubmitting, 
  hideButtons = false 
}: PrepagoFormProps) {
  return (
    <form id='prepago-form' onSubmit={onSubmit} className='space-y-6'>
      {/* Cliente info */}
      <div className='space-y-2'>
        <Label htmlFor='prepago-client' className='text-sm font-medium text-gray-700 dark:text-gray-300'>
          Cliente
        </Label>
        <div className='relative'>
          <User className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
          <Input 
            id='prepago-client' 
            value={client ? `${client.name} ${client.lastName}` : ''} 
            disabled 
            className='pl-10 bg-gray-50/50 dark:bg-slate-900/50 border-gray-200 dark:border-gray-800' 
          />
        </div>
      </div>

      {/* Saldo info */}
      <div className='p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20'>
        <div className='flex items-center gap-3'>
          <div className='p-2 rounded-lg bg-green-100 dark:bg-green-900/30'>
            <Wallet className='w-5 h-5 text-green-600 dark:text-green-400' />
          </div>
          <div>
            <p className='text-xs text-green-600 dark:text-green-400 font-medium uppercase tracking-wider'>Saldo Actual</p>
            <p className='text-2xl font-bold text-green-700 dark:text-green-300'>
              ${(client?.saldo || 0).toLocaleString('es-CL')}
            </p>
          </div>
        </div>
      </div>

      {/* Monto a cargar */}
      <div className='space-y-2'>
        <Label htmlFor='prepago-amount' className='text-sm font-medium text-gray-700 dark:text-gray-300'>
          Monto a Recargar
        </Label>
        <div className='relative'>
          <CreditCard className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
          <Input 
            id='prepago-amount' 
            type='text' 
            placeholder='Ej: 50.000' 
            value={amount}
            onChange={e => onAmountChange(e.target.value)} 
            required 
            disabled={isSubmitting} 
            className='pl-10 text-lg font-semibold'
            inputMode='numeric'
          />
        </div>
        <p className='text-[10px] text-gray-500 dark:text-gray-400'>
          * El monto se sumará inmediatamente al saldo disponible del cliente.
        </p>
      </div>

      {!hideButtons && (
        <div className='flex flex-col sm:flex-row justify-center gap-3 pt-2'>
          <Button 
            type='button' 
            variant='outline' 
            onClick={onCancel} 
            disabled={isSubmitting}
            className='flex items-center gap-2 rounded-full px-8 hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black w-full sm:w-auto order-2 sm:order-1 text-sm sm:text-base'
          >
            Cancelar
          </Button>
          <Button 
            type='submit' 
            variant='outline'
            disabled={isSubmitting || !amount}
            className='flex items-center bg-black text-white dark:bg-white dark:text-black gap-2 rounded-full px-8 hover:scale-105 transition-all duration-200 w-full sm:w-auto dark:hover:bg-gray-200 order-1 sm:order-2 text-sm sm:text-base'
          >
            {isSubmitting ? 'Procesando...' : 'Confirmar Recarga'}
          </Button>
        </div>
      )}
    </form>
  );
}

interface PrepagoModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    client: Client | null;
    amount: string;
    onAmountChange: (amount: string) => void;
    onSubmit: (e: React.FormEvent) => Promise<boolean>;
    isSubmitting: boolean;
}

export function PrepagoModal({
    isOpen,
    onOpenChange,
    client,
    amount,
    onAmountChange,
    onSubmit,
    isSubmitting
}: PrepagoModalProps) {
    const handleCancel = () => {
        onOpenChange(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        const success = await onSubmit(e);
        if (success) {
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className='max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl'>
                <DialogHeader className='p-6 pb-2 border-b'>
                    <DialogTitle className='text-xl font-bold flex items-center gap-2'>
                        <Wallet className='w-5 h-5 text-green-600' />
                        <span>Cargar Saldo Prepago</span>
                    </DialogTitle>
                    <DialogDescription className='sr-only'>
                        Formulario para cargar saldo al cliente
                    </DialogDescription>
                </DialogHeader>

                <div className='flex-1 overflow-y-auto p-6'>
                    <PrepagoForm
                        client={client}
                        amount={amount}
                        onAmountChange={onAmountChange}
                        onSubmit={handleSubmit}
                        onCancel={handleCancel}
                        isSubmitting={isSubmitting}
                        hideButtons={true}
                    />
                </div>

                <div className='border-t p-4 bg-gray-50 dark:bg-slate-900/50 flex justify-center gap-3 px-6 rounded-b-2xl'>
                    <Button
                        variant='outline'
                        onClick={handleCancel}
                        className='rounded-full px-6 dark:hover:bg-white dark:hover:text-black transition-all hover:scale-105'
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type='submit'
                        form='prepago-form'
                        className='bg-black text-white dark:bg-white dark:text-black dark:hover:bg-gray-200 rounded-full px-8 hover:bg-gray-800 transition-all hover:scale-105'
                        disabled={isSubmitting || !amount}
                    >
                        {isSubmitting ? (
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

export { PrepagoForm };