'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CajaWithUser, CajaRetiro } from '@/types/caja';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { Loader2, Wallet, Info } from 'lucide-react';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { disponibleParaRetiro } from '@/lib/business/cajaEfectivo';

const getDiaSemana = (fecha: string): string => {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const fechaObj = new Date(fecha);
  return dias[fechaObj.getDay()];
};

interface RetiroDineroDialogProps {
  caja: CajaWithUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetirar: (data: CajaRetiro) => Promise<boolean>;
  loading: boolean;
  mutationError?: string | null;
}

export function RetiroDineroDialog({
  caja,
  open,
  onOpenChange,
  onRetirar,
  loading,
  mutationError
}: RetiroDineroDialogProps) {
  const { user } = useCurrentUser();
  const [monto, setMonto] = useState('');
  const [motivo, setMotivo] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatMonto = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    if (numericValue === '') return '';
    const number = parseInt(numericValue);
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const getNumericValue = (formattedValue: string) => {
    return parseInt(formattedValue.replace(/[^\d]/g, '') || '0');
  };

  const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formatted = formatMonto(inputValue);
    const numericValue = getNumericValue(formatted);

    if (caja && numericValue > 0) {
      // `efectivo` ya viene neto de anticipos y retiros: restarlos acá descontaría
      // dos veces lo mismo y bloquearía retiros que sí caben.
      const disponible = disponibleParaRetiro(caja);
      if (numericValue > disponible) return;
    }

    setMonto(formatted);
    if (errors.monto) setErrors(prev => ({ ...prev, monto: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!caja || !user) {
      setErrors({ general: 'No hay caja seleccionada o usuario no autenticado' });
      return;
    }

    const montoNum = getNumericValue(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      setErrors({ monto: 'El monto debe ser un número mayor a 0' });
      return;
    }

    if (!motivo.trim()) {
      setErrors({ motivo: 'Debe ingresar un motivo para el retiro' });
      return;
    }

    const montoDisponible = disponibleParaRetiro(caja);
    if (montoNum > montoDisponible) {
      setErrors({
        monto: `El monto no puede ser mayor al disponible (${formatCurrencyCLP(montoDisponible)})`
      });
      return;
    }

    const success = await onRetirar({
      caja_id: caja.id_caja,
      monto: montoNum,
      motivo: motivo.trim(),
      usuario_id: user.id
    });

    if (success) {
      setMonto('');
      setMotivo('');
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setMonto('');
    setMotivo('');
    setErrors({});
    onOpenChange(false);
  };

  if (!caja) return null;

  const montoDisponible = disponibleParaRetiro(caja);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md border-none bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden p-0 flex flex-col'>
        <DialogHeader className='p-8 pb-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900'>
          <DialogTitle className='text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3'>
            <Wallet className='w-6 h-6 text-gray-900 dark:text-white' />
            Retirar Dinero - Caja {getDiaSemana(caja.fecha_apertura)}
          </DialogTitle>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-8 py-6 custom-scrollbar bg-white dark:bg-slate-900'>
          <div className='space-y-8'>
            {}
            <div className='bg-gray-50/50 dark:bg-gray-800/20 p-6 rounded-2xl border border-gray-100 dark:border-gray-800'>
              <div className='flex items-center gap-2 mb-4'>
                <Info className='w-4 h-4 text-gray-400' />
                <h4 className='font-bold text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500'>
                  Información de la caja
                </h4>
              </div>
              <div className='grid grid-cols-2 gap-y-5 gap-x-6 text-sm'>
                <div className='flex flex-col gap-1'>
                  <span className='text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest'>
                    Cajero
                  </span>
                  <span className='font-bold text-gray-900 dark:text-white truncate'>
                    {caja.cajero_nombre}
                  </span>
                </div>
                <div className='flex flex-col gap-1 text-right'>
                  <span className='text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest'>
                    Disponible
                  </span>
                  <span className='font-black text-lg text-emerald-600 dark:text-emerald-400'>
                    {formatCurrencyCLP(montoDisponible)}
                  </span>
                </div>
              </div>
            </div>

            <form id='retiro-form' onSubmit={handleSubmit} className='space-y-6'>
              {}
              <div className='space-y-2'>
                <Label
                  htmlFor='monto'
                  className='text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1'
                >
                  Monto a Retirar ($)
                </Label>
                <Input
                  id='monto'
                  type='text'
                  value={monto}
                  onChange={handleMontoChange}
                  placeholder='Ingresa el monto...'
                  className='rounded-2xl bg-gray-50/50 dark:bg-slate-900/50 border-gray-200 dark:border-gray-800 h-12 text-base font-bold text-gray-900 dark:text-white placeholder:text-gray-400 focus-visible:ring-black'
                  disabled={loading}
                />
                {errors.monto && (
                  <p className='text-xs text-red-500 font-bold mt-1 ml-1'>{errors.monto}</p>
                )}
              </div>

              {}
              <div className='space-y-2'>
                <Label
                  htmlFor='motivo'
                  className='text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1'
                >
                  Motivo del Retiro
                </Label>
                <Textarea
                  id='motivo'
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  placeholder='Ej: Pago a proveedor, Gastos operacionales...'
                  rows={3}
                  className='rounded-2xl bg-gray-50/50 dark:bg-slate-900/50 border-gray-200 dark:border-gray-800 text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus-visible:ring-black'
                  disabled={loading}
                />
                {errors.motivo && (
                  <p className='text-xs text-red-500 font-bold mt-1 ml-1'>{errors.motivo}</p>
                )}
              </div>

              {}
              {(errors.general || mutationError) && (
                <div className='text-xs text-red-600 text-center font-bold bg-red-50 dark:bg-red-900/10 p-3 rounded-2xl border border-red-100 dark:border-red-900/30'>
                  {errors.general || mutationError}
                </div>
              )}
            </form>
          </div>
        </div>

        {}
        <div className='shrink-0 border-t border-gray-100 dark:border-gray-800 p-6 bg-gray-50 dark:bg-slate-900/50 flex justify-center gap-4'>
          <Button
            type='button'
            variant='outline'
            className='rounded-full px-8 h-10 dark:hover:bg-white dark:hover:text-black font-bold text-xs uppercase tracking-widest transition-all hover:scale-105'
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type='submit'
            form='retiro-form'
            disabled={loading}
            className='rounded-full px-8 h-10 bg-black dark:bg-white text-white dark:text-black hover:scale-105 transition-all duration-200 font-bold text-xs uppercase tracking-widest'
          >
            {loading && <Loader2 className='h-4 w-4 mr-2 animate-spin' />}
            Confirmar Retiro
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
