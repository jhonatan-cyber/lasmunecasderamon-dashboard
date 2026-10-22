'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { CuentaWithDetails } from '@/types/cuenta';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';

interface SolicitarAnulacionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cuenta: CuentaWithDetails | null;
  motivo: string;
  onMotivoChange: (value: string) => void;
  monto: string;
  onMontoChange: (value: string) => void;
  anulando: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export function SolicitarAnulacionModal({
  open,
  onOpenChange,
  cuenta,
  motivo,
  onMotivoChange,
  monto,
  onMontoChange,
  anulando,
  onConfirmar,
  onCancelar
}: SolicitarAnulacionModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (anulando) return;
        onOpenChange(next);
        if (!next) {
          onCancelar();
        }
      }}
    >
      <DialogContent className='max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl'>
        <DialogHeader className='p-6 pb-2 border-b'>
          <DialogTitle className='text-xl font-bold'>Solicitar anulacion</DialogTitle>
          <DialogDescription>
            Completa el motivo y el monto antes de enviar la solicitud por WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto p-6 space-y-6'>
          <div className='rounded-2xl border bg-slate-50 p-4 dark:bg-slate-900/60'>
            <div className='text-sm text-slate-500 dark:text-slate-400'>Cuenta</div>
            <div className='font-semibold text-slate-900 dark:text-slate-100'>
              {cuenta?.codigo || '-'}
            </div>
            <div className='mt-3 text-sm text-slate-500 dark:text-slate-400'>Cliente</div>
            <div className='font-semibold text-slate-900 dark:text-slate-100'>
              {cuenta?.cliente_nombre || 'Sin registrar'}
            </div>
            <div className='mt-3 text-sm text-slate-500 dark:text-slate-400'>Monto total</div>
            <div className='text-lg font-black text-amber-600 dark:text-amber-400'>
              {formatCurrencyNoDecimals(Number(cuenta?.total || 0))}
            </div>
          </div>

          <div>
            <Label htmlFor='monto-anulacion-cuenta' className='mb-2 text-sm sm:text-base'>
              Monto a solicitar
            </Label>
            <span className='text-xs text-red-500'> *</span>
            <Input
              id='monto-anulacion-cuenta'
              type='text'
              inputMode='numeric'
              value={monto}
              onChange={event => onMontoChange(event.target.value)}
              placeholder='Ingresa el monto'
            />
            <p className='text-xs text-slate-500 dark:text-slate-400 mt-1'>
              Total de referencia: {formatCurrencyNoDecimals(Number(cuenta?.total || 0))}
            </p>
          </div>

          <div>
            <Label htmlFor='motivo-anulacion-cuenta' className='mb-2 text-sm sm:text-base'>
              Motivo
            </Label>
            <span className='text-xs text-red-500'> *</span>
            <Textarea
              id='motivo-anulacion-cuenta'
              value={motivo}
              onChange={event => onMotivoChange(event.target.value)}
              placeholder='Escribe el motivo de la anulacion'
              rows={5}
              className='mt-2'
            />
          </div>
        </div>

        <div className='border-t p-4 bg-gray-50 dark:bg-slate-900/50 flex justify-center gap-3 px-6 rounded-b-2xl'>
          <Button
            variant='outline'
            onClick={onCancelar}
            className='rounded-full px-6 dark:hover:bg-white dark:hover:text-black transition-all hover:scale-105'
            disabled={anulando}
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirmar}
            className='bg-black text-white dark:bg-black dark:text-white dark:hover:bg-white! dark:hover:text-black! rounded-full px-8 hover:bg-white! hover:text-black! transition-all hover:scale-105 border-2'
            disabled={anulando}
          >
            {anulando ? (
              <div className='flex items-center gap-2'>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span>Enviando...</span>
              </div>
            ) : (
              <span>Enviar solicitud</span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
