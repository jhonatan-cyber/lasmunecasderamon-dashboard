 
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CajaCreate } from '@/types/caja';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { formatNumberCL } from '@/lib/utils/formatters';
import { formatDateTimeDmyLabel } from '@/lib/utils/calendarUtils';

import { Plus, Loader2, DollarSign, Calendar } from 'lucide-react';
interface CajaFormDialogProps {
  onCajaCreated: (caja: any) => void;
  loading?: boolean;
  disabled?: boolean;
  hideButton?: boolean;
}

export const CajaFormDialog = ({
  onCajaCreated,
  loading = false,
  disabled = false,
  hideButton = false
}: CajaFormDialogProps) => {
  const { user: currentUser } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<CajaCreate>({
    monto_apertura: 0,
    usuario_id_apertura: 0
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [displayValue, setDisplayValue] = useState('');

  // Actualizar fecha y hora en tiempo real
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Formatear número con separador de miles
  const formatNumber = (value: number): string => {
    if (!value || value === 0) return '';
    return formatNumberCL(value);
  };

  // Parsear número desde string formateado
  const parseFormattedNumber = (value: string): number => {
    if (!value) return 0;
    // Remover puntos de miles
    const cleanValue = value.replace(/\./g, '');
    return parseFloat(cleanValue) || 0;
  };

  const handleInputChange = (inputValue: string) => {
    // Permitir solo números
    const cleanValue = inputValue.replace(/[^\d]/g, '');
    
    if (cleanValue === '') {
      setDisplayValue('');
      setFormData(prev => ({
        ...prev,
        monto_apertura: 0
      }));
    } else {
      const numericValue = parseInt(cleanValue, 10);
      setDisplayValue(formatNumber(numericValue));
      setFormData(prev => ({
        ...prev,
        monto_apertura: numericValue
      }));
    }

    // Limpiar error del campo
    if (errors.monto_apertura) {
      setErrors(prev => ({
        ...prev,
        monto_apertura: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.monto_apertura <= 0) {
      newErrors.monto_apertura = 'El monto debe ser mayor a 0';
    }

    if (!currentUser?.id) {
      newErrors.usuario = 'No hay usuario logueado';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Asegurar que el usuario logueado esté disponible
    if (!currentUser?.id) {
      console.error('No hay usuario logueado');
      return;
    }

    try {
      const dataToSend = {
        ...formData,
        usuario_id_apertura: currentUser.id
      };
      await onCajaCreated(dataToSend);
      setOpen(false);
      setFormData({
        monto_apertura: 0,
        usuario_id_apertura: currentUser?.id || 0
      });
      setErrors({});
    } catch (error) {
      console.error('Error al crear caja:', error);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setFormData({
        monto_apertura: 0,
        usuario_id_apertura: currentUser?.id || 0
      });
      setDisplayValue('');
      setErrors({});
    }
  };

  // Si hideButton es true, no renderizar el botón
  if (hideButton) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size='sm'
          variant='default'
          className='whitespace-nowrap inline-flex items-center bg-black text-white rounded-full px-6 py-2 hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto'
          disabled={loading || disabled}
        >
          <Plus className='w-4 h-4 mr-2' />
          Abrir Nueva Caja
        </Button>
      </DialogTrigger>
      <DialogContent className='max-w-md w-full border-none shadow-2xl bg-white dark:bg-slate-900 rounded-[2rem] p-0 overflow-hidden'>
        <DialogHeader className="px-8 pt-8 pb-4 border-b border-slate-100 dark:border-white/5">
          <DialogTitle className='text-xl font-black tracking-tight'>Apertura de Caja</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='flex flex-col'>
          <div className="px-8 py-6 space-y-6">
            <div className="space-y-3">
              <Label htmlFor='monto_apertura' className='text-[10px] uppercase tracking-widest font-black text-slate-400 ml-1'>
                Monto Inicial en Efectivo
              </Label>
              <div className='relative group'>
                <DollarSign className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-black transition-colors' />
                <Input
                  id='monto_apertura'
                  type='text'
                  placeholder='0'
                  value={displayValue}
                  onChange={e => handleInputChange(e.target.value)}
                  className='pl-12 h-14 bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/10 rounded-2xl text-lg font-bold tabular-nums focus-visible:ring-black transition-all'
                />
              </div>
              {errors.monto_apertura && (
                <p className='text-xs font-bold text-rose-500 mt-1 ml-1'>{errors.monto_apertura}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label className='text-[10px] uppercase tracking-widest font-black text-slate-400 ml-1'>
                Fecha y Hora de Registro
              </Label>
              <div className='relative'>
                <Calendar className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300' />
                <Input
                  readOnly
                  value={`${formatDateTimeDmyLabel(currentDateTime.toISOString()).date} ${formatDateTimeDmyLabel(currentDateTime.toISOString()).time}`}
                  className='pl-12 h-14 bg-slate-100/50 dark:bg-white/5 border-transparent rounded-2xl text-sm font-medium text-slate-500'
                />
              </div>
            </div>
          </div>

          <div className="px-8 py-6 bg-slate-50 dark:bg-black/20 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row gap-3">
            <Button
              type='button'
              variant='outline'
              className='rounded-full px-6 dark:hover:bg-white dark:hover:text-black transition-all hover:scale-105'
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type='submit'
              className='bg-black text-white dark:bg-white dark:text-black dark:hover:bg-gray-200 rounded-full px-8 transition-all hover:scale-105'
              disabled={loading}
            >
              {loading ? (
                <div className='flex items-center gap-2'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  <span>Procesando...</span>
                </div>
              ) : (
                <span>Confirmar Apertura</span>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

