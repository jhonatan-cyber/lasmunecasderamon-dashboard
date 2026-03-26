'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Client } from '@/types/client';

interface PrepagoFormProps {
  client: Client | null;
  amount: string;
  onAmountChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  hideButtons?: boolean;
}

// UI pura — estado gestionado por usePrepagoForm en la page
export function PrepagoForm({ client, amount, onAmountChange, onSubmit, onCancel, isSubmitting, hideButtons = false }: PrepagoFormProps) {
  return (
    <form id='prepago-form' onSubmit={onSubmit} className='space-y-4 py-4'>
      <div className='space-y-2'>
        <Label htmlFor='prepago-client'>Cliente</Label>
        <Input id='prepago-client' value={client ? `${client.name} ${client.lastName}` : ''} disabled className='bg-gray-100' />
      </div>
      <div className='space-y-2'>
        <Label>Saldo Actual</Label>
        <div className='text-xl font-bold'>${(client?.saldo || 0).toLocaleString('es-CL')}</div>
      </div>
      <div className='space-y-2'>
        <Label htmlFor='prepago-amount'>Monto a Cargar</Label>
        <Input id='prepago-amount' type='number' placeholder='Ej: 50000' value={amount}
          onChange={e => onAmountChange(e.target.value)} required min='1' disabled={isSubmitting} />
      </div>
      {!hideButtons && (
        <div className='flex flex-col sm:flex-row justify-center gap-2 w-full'>
          <Button type='button' variant='outline' onClick={onCancel} disabled={isSubmitting}
            className='rounded-full px-6 hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white w-full sm:w-auto'>
            Cancelar
          </Button>
          <Button type='submit' disabled={isSubmitting || !amount}
            className='bg-black text-white rounded-full px-6 hover:scale-105 transition-all duration-200 w-full sm:w-auto'>
            {isSubmitting ? 'Cargando...' : 'Confirmar Carga'}
          </Button>
        </div>
      )}
    </form>
  );
}
