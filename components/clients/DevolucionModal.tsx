'use client';

import { Wallet, Loader2, User, CreditCard, ArrowDownCircle, Building2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Client } from '@/types/client';
import { useAuth } from '@/contexts/AuthContext';

interface DevolucionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  amount: string;
  paymentMethod: string;
  motivo: string;
  onAmountChange: (value: string) => void;
  onPaymentMethodChange: (value: string) => void;
  onMotivoChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<boolean>;
  isSubmitting: boolean;
}

export function DevolucionModal({
  isOpen,
  onOpenChange,
  client,
  amount,
  paymentMethod,
  motivo,
  onAmountChange,
  onPaymentMethodChange,
  onMotivoChange,
  onSubmit,
  isSubmitting
}: DevolucionModalProps) {
  const { user } = useAuth();
  const isCajero = user?.role?.toLowerCase().includes('cajero') || user?.role?.toLowerCase().includes('cajera');
  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    const success = await onSubmit(e);
    if (success) {
      onOpenChange(false);
    }
  };

  const saldo = Number(client?.saldo || 0);
  const montoNum = Number(String(amount || '').replace(/\./g, '')) || 0;
  const excedeSaldo = montoNum > saldo;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl'>
        <DialogHeader className='p-6 pb-2 border-b'>
          <DialogTitle className='text-xl font-bold flex items-center gap-2'>
            {isCajero ? <Send className='w-5 h-5 text-amber-600' /> : <ArrowDownCircle className='w-5 h-5 text-red-600' />}
            <span>{isCajero ? 'Solicitar Devolucion' : 'Devolucion de Saldo'}</span>
          </DialogTitle>
          <DialogDescription className='sr-only'>
            {isCajero ? 'Enviar recordatorio de devolucion al administrador por WhatsApp' : 'Formulario para devolver saldo al cliente'}
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto p-6'>
          <form id='devolucion-form' onSubmit={handleSubmit} className='space-y-6'>
            <div className='space-y-2'>
              <Label className='text-sm font-medium text-gray-700 dark:text-gray-300'>Cliente</Label>
              <div className='relative'>
                <User className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
                <Input
                  value={client ? `${client.name} ${client.lastName}` : ''}
                  disabled
                  className='pl-10 bg-gray-50/50 dark:bg-slate-900/50 border-gray-200 dark:border-gray-800'
                />
              </div>
            </div>

            <div className='p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20'>
              <div className='flex items-center gap-3'>
                <div className='p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30'>
                  <Wallet className='w-5 h-5 text-amber-600 dark:text-amber-400' />
                </div>
                <div>
                  <p className='text-xs text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wider'>Saldo Disponible</p>
                  <p className='text-2xl font-bold text-amber-700 dark:text-amber-300'>${saldo.toLocaleString('es-CL')}</p>
                </div>
              </div>
              {excedeSaldo && (
                <p className='text-xs text-red-600 mt-2 font-medium'>El monto excede el saldo disponible</p>
              )}
            </div>

            <div className='space-y-2'>
              <Label className='text-sm font-medium text-gray-700 dark:text-gray-300'>Metodo de devolucion</Label>
              <div className='p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 flex items-center gap-3'>
                <div className='p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30'>
                  <Building2 className='w-4 h-4 text-blue-600 dark:text-blue-400' />
                </div>
                <div>
                  <p className='text-sm font-bold text-blue-700 dark:text-blue-300'>Transferencia</p>
                  <p className='text-[10px] text-blue-600 dark:text-blue-400'>
                    {isCajero ? 'Se notificara al administrador por WhatsApp' : 'No afecta caja, solo saldo pendiente'}
                  </p>
                </div>
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='devolucion-amount' className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                Monto a Devolver
              </Label>
              <div className='relative'>
                <CreditCard className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
                <Input
                  id='devolucion-amount'
                  type='text'
                  placeholder='Ej: 10.000'
                  value={amount}
                  onChange={e => onAmountChange(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className='pl-10 text-lg font-semibold'
                  inputMode='numeric'
                />
              </div>
              <p className='text-[10px] text-gray-500 dark:text-gray-400'>* El monto se descontara del saldo del cliente y se registrara salida de caja.</p>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='devolucion-motivo' className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                Motivo (opcional)
              </Label>
              <Textarea
                id='devolucion-motivo'
                placeholder='Ej: Cliente solicita devolucion, error en carga...'
                value={motivo}
                onChange={e => onMotivoChange(e.target.value)}
                disabled={isSubmitting}
                rows={2}
                className='resize-none'
              />
            </div>
          </form>
        </div>

        <div className='border-t p-4 bg-gray-50 dark:bg-slate-900/50 flex justify-center gap-3 px-6 rounded-b-2xl'>
          <Button variant='outline' onClick={handleCancel} className='rounded-full px-6' disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type='submit'
            form='devolucion-form'
            className={`${isCajero ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'} text-white rounded-full px-8`}
            disabled={isSubmitting || !amount || excedeSaldo || montoNum <= 0}
          >
            {isSubmitting ? (
              <span className='flex items-center gap-2'>
                <Loader2 className='w-4 h-4 animate-spin' /> Procesando...
              </span>
            ) : isCajero ? (
              <span className='flex items-center gap-2'>
                <Send className='w-4 h-4' /> Enviar recordatorio
              </span>
            ) : (
              'Confirmar Devolucion'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
