'use client';

import { BedDouble, Hash, Loader2, Printer, ReceiptText, User, Wallet } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { metodoPagoLabels } from '@/lib/business/salesUtils';
import { getCardSplit } from './productModalRules';

interface ConfirmSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isRegistering: boolean;
  orderCode?: string;
  cliente?: string;
  totalPedido: number;
  propina: number;
  recargoAnfitrionas: number;
  total: number;
  metodoPago: string;
  habitacion?: string;
  tiempoHabitacion?: number;
}

export function ConfirmSaleDialog({
  open,
  onOpenChange,
  onCancel,
  onConfirm,
  isRegistering,
  orderCode,
  cliente,
  totalPedido,
  propina,
  recargoAnfitrionas,
  total,
  metodoPago,
  habitacion,
  tiempoHabitacion
}: ConfirmSaleDialogProps) {
  const splitVentaPct = Number(useConfigValue('comisiones', 'split_tarjeta_venta', '51'));
  const splitPropinaPct = Number(useConfigValue('comisiones', 'split_tarjeta_propina', '49'));
  const esTarjeta = metodoPago === 'tarjeta' && total > 0;
  const splitTarjeta = esTarjeta ? getCardSplit(total) : { venta: 0, propina: 0 };
  const metodoPagoLabel =
    metodoPagoLabels[metodoPago as keyof typeof metodoPagoLabels] || metodoPago || 'Sin definir';

  // Cerrar el diálogo mientras se registra dejaría la venta en curso sin verla terminar.
  const handleOpenChange = (next: boolean) => {
    if (next) {
      onOpenChange(true);
      return;
    }
    if (isRegistering) return;
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='flex max-h-[94dvh] w-[calc(100vw-1rem)] max-w-md flex-col gap-0 overflow-hidden rounded-2xl border border-border/60 bg-white p-0 sm:w-full dark:border-zinc-800 dark:bg-zinc-950 [&>button]:right-3 [&>button]:top-3 [&>button]:flex [&>button]:h-9 [&>button]:w-9 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:opacity-100 [&>button:hover]:bg-accent'>
        <DialogHeader className='shrink-0 border-b border-border/60 px-4 pb-4 pr-14 pt-5 text-left sm:px-6 dark:border-zinc-800'>
          <DialogTitle className='flex items-center gap-2.5 text-lg text-gray-900 dark:text-zinc-100'>
            <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'>
              <ReceiptText className='h-4 w-4' aria-hidden='true' />
            </span>
            Confirmar registro de venta
          </DialogTitle>
          <DialogDescription className='text-gray-600 dark:text-zinc-400'>
            Revisa el resumen antes de cobrar. La venta quedará registrada en caja.
          </DialogDescription>
        </DialogHeader>

        <div className='min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6'>
          <section className='rounded-2xl border border-border/60 bg-muted/30 p-4 dark:border-zinc-800 dark:bg-zinc-900/40'>
            <div className='flex items-baseline justify-between gap-3'>
              <span className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                Total a cobrar
              </span>
              <span className='text-2xl font-black tabular-nums text-gray-900 dark:text-zinc-50'>
                {formatCurrencyCLP(total)}
              </span>
            </div>
            <Separator className='my-3' />
            <dl className='space-y-1.5 text-sm'>
              <div className='flex items-center justify-between gap-3'>
                <dt className='text-muted-foreground'>Pedido</dt>
                <dd className='font-semibold tabular-nums'>{formatCurrencyCLP(totalPedido)}</dd>
              </div>
              {recargoAnfitrionas > 0 && (
                <div className='flex items-center justify-between gap-3 text-orange-600 dark:text-orange-400'>
                  <dt>Recargo anfitrionas</dt>
                  <dd className='font-semibold tabular-nums'>
                    {formatCurrencyCLP(recargoAnfitrionas)}
                  </dd>
                </div>
              )}
              {propina > 0 && (
                <div className='flex items-center justify-between gap-3 text-blue-600 dark:text-blue-400'>
                  <dt>Propina</dt>
                  <dd className='font-semibold tabular-nums'>{formatCurrencyCLP(propina)}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className='space-y-2 text-sm'>
            <div className='flex items-center gap-2.5'>
              <Hash className='h-4 w-4 shrink-0 text-muted-foreground' aria-hidden='true' />
              <span className='text-muted-foreground'>Pedido</span>
              <span className='ml-auto min-w-0 truncate font-semibold'>{orderCode || '—'}</span>
            </div>
            <div className='flex items-center gap-2.5'>
              <Wallet className='h-4 w-4 shrink-0 text-muted-foreground' aria-hidden='true' />
              <span className='text-muted-foreground'>Método de pago</span>
              <span className='ml-auto font-semibold'>{metodoPagoLabel}</span>
            </div>
            {cliente && (
              <div className='flex items-center gap-2.5'>
                <User className='h-4 w-4 shrink-0 text-muted-foreground' aria-hidden='true' />
                <span className='text-muted-foreground'>Cliente</span>
                <span className='ml-auto min-w-0 truncate font-semibold'>{cliente}</span>
              </div>
            )}
            {habitacion && (
              <div className='flex items-center gap-2.5'>
                <BedDouble className='h-4 w-4 shrink-0 text-muted-foreground' aria-hidden='true' />
                <span className='text-muted-foreground'>Habitación</span>
                <span className='ml-auto min-w-0 truncate text-right font-semibold'>
                  {habitacion}
                  {tiempoHabitacion ? ` · ${tiempoHabitacion} min` : ''}
                </span>
              </div>
            )}
          </section>

          {esTarjeta && (
            <div className='rounded-xl border border-amber-200/70 bg-amber-50/80 px-3 py-2 text-xs leading-5 text-slate-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-slate-100'>
              <span className='font-black uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300'>
                Tarjetero
              </span>{' '}
              Genera venta por{' '}
              <span className='font-black text-emerald-600 dark:text-emerald-300'>
                {formatCurrencyCLP(splitTarjeta.venta)}
              </span>{' '}
              ({splitVentaPct}%) y propina por{' '}
              <span className='font-black text-fuchsia-600 dark:text-fuchsia-300'>
                {formatCurrencyCLP(splitTarjeta.propina)}
              </span>{' '}
              ({splitPropinaPct}%). Solo informativo, no afecta la caja.
            </div>
          )}

          <p className='flex items-center gap-2 text-xs text-muted-foreground'>
            <Printer className='h-3.5 w-3.5 shrink-0' aria-hidden='true' />
            Se abrirá el ticket de la venta para imprimir.
          </p>
        </div>

        <DialogFooter className='shrink-0 gap-2 border-t border-border/60 bg-muted/20 px-4 py-3 sm:flex-row sm:justify-end sm:space-x-0 sm:px-6 dark:border-zinc-800 dark:bg-zinc-900/40'>
          <Button
            type='button'
            variant='outline'
            onClick={onCancel}
            disabled={isRegistering}
            className='w-full rounded-full sm:w-auto dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800'
          >
            Volver
          </Button>
          <Button
            type='button'
            onClick={onConfirm}
            disabled={isRegistering}
            className='w-full rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-70 sm:w-auto dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400'
          >
            {isRegistering ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' aria-hidden='true' />
                Registrando...
              </>
            ) : (
              'Confirmar venta'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
