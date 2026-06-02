'use client';

import { useEffect } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { useSaleAnulacionForm } from '@/hooks/personal';

interface AnulacionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: { motivo: string; monto: number }) => void;
  loading?: boolean;
  ventaInfo?: {
    codigo: string;
    total: number;
    cliente_nombre: string;
  };
}

const formatMontoInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('es-CL').format(Number(digits));
};

export function AnulacionModal({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  ventaInfo
}: AnulacionModalProps) {
  const { motivo, setMotivo, monto, setMonto, handleConfirm, handleCancel } = useSaleAnulacionForm({
    onOpenChange,
    onConfirm
  });

  useEffect(() => {
    if (open && ventaInfo?.total) {
      setMonto(formatMontoInput(String(ventaInfo.total)));
    }
  }, [open, ventaInfo?.total, setMonto]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] w-[95vw] max-w-[95vw] flex-col p-0 sm:w-auto sm:max-w-[425px]'>
        <DialogHeader className='flex-shrink-0 border-b px-6 pt-6 pb-4 dark:border-gray-700'>
          <DialogTitle className='mb-4 flex items-center gap-2 text-lg text-red-600 dark:text-red-400 sm:mb-6 sm:text-xl'>
            <AlertTriangle className='h-4 w-4 sm:h-5 sm:w-5' />
            Solicitud Anulación
          </DialogTitle>
          <DialogDescription className='text-center text-sm text-gray-600 dark:text-gray-400 sm:text-base'>
            ¿Estás seguro de que deseas solicitar la anulación de esta venta? Esta acción requerirá
            la aprobación del administrador.
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4'>
          <div className='space-y-4'>
            {ventaInfo && (
              <div className='rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800'>
                <div className='text-xs text-gray-600 dark:text-gray-300 sm:text-sm'>
                  <strong>Código de venta:</strong> {ventaInfo.codigo}
                </div>
                <div className='text-xs text-gray-600 dark:text-gray-300 sm:text-sm'>
                  <strong>Cliente:</strong> {ventaInfo.cliente_nombre}
                </div>
                <div className='text-xs text-gray-600 dark:text-gray-300 sm:text-sm'>
                  <strong>Total:</strong> {formatCurrencyCLP(ventaInfo.total || 0)}
                </div>
              </div>
            )}

            <div className='space-y-2'>
              <Label
                htmlFor='monto'
                className='text-sm font-medium text-gray-900 dark:text-gray-100 sm:text-base'
              >
                Monto solicitado *
              </Label>
              <Input
                id='monto'
                type='text'
                inputMode='numeric'
                placeholder='Ingresa el monto'
                value={monto}
                onChange={e => setMonto(formatMontoInput(e.target.value))}
                className='bg-white text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 sm:text-base'
                required
              />
              {ventaInfo && (
                <p className='text-xs text-gray-500 dark:text-gray-400'>
                  Total de referencia: {formatCurrencyCLP(ventaInfo.total || 0)}
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label
                htmlFor='motivo'
                className='text-sm font-medium text-gray-900 dark:text-gray-100 sm:text-base'
              >
                Motivo de la anulación *
              </Label>
              <Textarea
                id='motivo'
                placeholder='Describe el motivo de la anulación...'
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                className='min-h-[100px] bg-white text-sm text-gray-900 placeholder:text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400 sm:text-base'
                required
              />
            </div>
          </div>
        </div>

        <div className='flex-shrink-0 border-t px-6 py-4 dark:border-gray-700'>
          <div className='flex flex-col items-center justify-center gap-4 sm:flex-row'>
            <Button
              size='sm'
              variant='outline'
              className='w-full rounded-full text-sm transition-all duration-200 hover:scale-105 hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white dark:hover:text-black sm:w-auto sm:text-base'
              onClick={handleCancel}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading || !motivo.trim() || !monto.trim()}
              size='sm'
              variant='outline'
              className='w-full rounded-full bg-black text-sm text-white transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black sm:w-auto sm:text-base'
            >
              {loading ? 'Enviando...' : 'Solicitar Anulación'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

