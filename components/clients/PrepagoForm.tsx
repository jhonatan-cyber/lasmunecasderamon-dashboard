'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Client } from '@/types/client';
import { Wallet, User, CreditCard } from 'lucide-react';

interface PrepagoFormProps {
  client: Client | null;
  amount: string;
  onAmountChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  hideButtons?: boolean;
}

export function PrepagoForm({ 
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
