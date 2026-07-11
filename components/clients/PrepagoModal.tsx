'use client';

import { useMemo } from 'react';
import { Wallet, Loader2, User, CreditCard, DollarSign, Split, Trash2, Plus } from 'lucide-react';
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
import { PaymentMethodSelect } from '@/components/shared/selects';
import { metodoPagoLabels } from '@/lib/business/salesUtils';
import { formatCurrencyCLP, formatNumberInput, parseNumberInput } from '@/lib/utils/formatters';
import { Client } from '@/types/client';

type MixedPayment = {
  metodo: 'efectivo' | 'tarjeta' | 'transferencia';
  monto: number;
  display: string;
};

interface PrepagoFormProps {
  client: Client | null;
  amount: string;
  paymentMethod: string;
  mixedPayments: MixedPayment[];
  onAmountChange: (value: string) => void;
  onPaymentMethodChange: (value: string) => void;
  onMixedPaymentsChange: (payments: MixedPayment[]) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  hideButtons?: boolean;
}

function PrepagoForm({
  client,
  amount,
  paymentMethod,
  mixedPayments,
  onAmountChange,
  onPaymentMethodChange,
  onMixedPaymentsChange,
  onSubmit,
  onCancel,
  isSubmitting,
  hideButtons = false
}: PrepagoFormProps) {
  const totalAmount = useMemo(() => {
    return Number(String(amount || '').replace(/\./g, '')) || 0;
  }, [amount]);

  const mixedTotal = useMemo(() => {
    return mixedPayments.reduce((sum, pago) => sum + Number(pago.monto || 0), 0);
  }, [mixedPayments]);

  const missingAmount = totalAmount - mixedTotal;

  const availableMethods = ['efectivo', 'tarjeta', 'transferencia'] as const;

  return (
    <form id='prepago-form' onSubmit={onSubmit} className='space-y-6'>
      {}
      <div className='space-y-2'>
        <Label
          htmlFor='prepago-client'
          className='text-sm font-medium text-gray-700 dark:text-gray-300'
        >
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

      {}
      <div className='p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20'>
        <div className='flex items-center gap-3'>
          <div className='p-2 rounded-lg bg-green-100 dark:bg-green-900/30'>
            <Wallet className='w-5 h-5 text-green-600 dark:text-green-400' />
          </div>
          <div>
            <p className='text-xs text-green-600 dark:text-green-400 font-medium uppercase tracking-wider'>
              Saldo Actual
            </p>
            <p className='text-2xl font-bold text-green-700 dark:text-green-300'>
              ${(client?.saldo || 0).toLocaleString('es-CL')}
            </p>
          </div>
        </div>
      </div>

      <PaymentMethodSelect
        value={paymentMethod}
        onChange={onPaymentMethodChange}
        label='Metodo de pago'
        placeholder='Seleccionar metodo de pago'
        className='w-full'
        showPrepago={false}
        showMixto={true}
      />

      {paymentMethod === 'mixto' && (
        <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60'>
          <div className='mb-3 flex items-center gap-2'>
            <Split className='h-4 w-4 text-slate-700 dark:text-slate-200' />
            <p className='text-xs font-bold uppercase tracking-[0.2em] text-slate-700 dark:text-slate-200'>
              Distribucion de pagos
            </p>
          </div>

          <div className='space-y-3'>
            {mixedPayments.map((pago, index) => (
              <div key={`${pago.metodo}-${index}`} className='flex items-center gap-2'>
                <div className='w-28 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300'>
                  {metodoPagoLabels[pago.metodo]}
                </div>
                <div className='relative flex-1'>
                  <span className='absolute inset-y-0 left-3 flex items-center text-slate-400 dark:text-slate-500'>
                    <DollarSign className='h-4 w-4' />
                  </span>
                  <Input
                    type='text'
                    value={pago.display}
                    placeholder='0'
                    onChange={e => {
                      const monto = parseNumberInput(e.target.value);
                      onMixedPaymentsChange(
                        mixedPayments.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                monto,
                                display: monto > 0 ? formatNumberInput(monto) : ''
                              }
                            : item
                        )
                      );
                    }}
                    disabled={isSubmitting}
                    className='w-full rounded-full border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-black focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-400'
                  />
                </div>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    onMixedPaymentsChange(
                      mixedPayments.filter((_, itemIndex) => itemIndex !== index)
                    )
                  }
                  disabled={isSubmitting}
                  className='rounded-full px-3 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
                >
                  <Trash2 className='h-3.5 w-3.5' />
                </Button>
              </div>
            ))}
          </div>

          <div className='mt-4 flex flex-wrap gap-2'>
            {availableMethods.map(metodo => {
              if (mixedPayments.some(pago => pago.metodo === metodo)) return null;

              return (
                <Button
                  key={metodo}
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    onMixedPaymentsChange([
                      ...mixedPayments,
                      {
                        metodo,
                        monto: 0,
                        display: ''
                      }
                    ])
                  }
                  disabled={isSubmitting}
                  className='rounded-full uppercase dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
                >
                  <Plus className='mr-1 h-3.5 w-3.5' />
                  {metodoPagoLabels[metodo]}
                </Button>
              );
            })}
          </div>

          <div className='mt-4 border-t border-slate-200 pt-3 text-sm dark:border-slate-800'>
            <div className='flex items-center justify-between text-slate-600 dark:text-slate-300'>
              <span>Suma actual</span>
              <span
                className={
                  Math.abs(mixedTotal - totalAmount) <= 1
                    ? 'font-bold text-emerald-600'
                    : 'font-bold text-red-500'
                }
              >
                {formatCurrencyCLP(mixedTotal)}
              </span>
            </div>

            {mixedPayments.length < 2 && (
              <p className='mt-1 text-xs text-red-500'>
                Agrega al menos 2 metodos para el pago mixto.
              </p>
            )}

            {Math.abs(mixedTotal - totalAmount) > 1 && (
              <p className='mt-1 text-xs text-red-500'>
                Falta {formatCurrencyCLP(Math.abs(missingAmount))}
              </p>
            )}
          </div>
        </div>
      )}

      {}
      <div className='space-y-2'>
        <Label
          htmlFor='prepago-amount'
          className='text-sm font-medium text-gray-700 dark:text-gray-300'
        >
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
  paymentMethod: string;
  mixedPayments: MixedPayment[];
  onAmountChange: (amount: string) => void;
  onPaymentMethodChange: (method: string) => void;
  onMixedPaymentsChange: (payments: MixedPayment[]) => void;
  onSubmit: (e: React.FormEvent) => Promise<boolean>;
  isSubmitting: boolean;
}

export function PrepagoModal({
  isOpen,
  onOpenChange,
  client,
  amount,
  paymentMethod,
  mixedPayments,
  onAmountChange,
  onPaymentMethodChange,
  onMixedPaymentsChange,
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
            paymentMethod={paymentMethod}
            mixedPayments={mixedPayments}
            onAmountChange={onAmountChange}
            onPaymentMethodChange={onPaymentMethodChange}
            onMixedPaymentsChange={onMixedPaymentsChange}
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
