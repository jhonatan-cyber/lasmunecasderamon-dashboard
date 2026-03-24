/* eslint-disable */
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
import { formatNumberCL } from '@/lib/formatters';
import { formatDateTimeDmyLabel } from '@/lib/calendarUtils';

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
          variant='outline'
          className='rounded-full bg-black text-white hover:scale-105 transition-all duration-200 text-sm sm:text-base px-4 sm:px-6 py-2'
          disabled={loading || disabled}
        >
          <Plus className='w-3 h-3 sm:w-4 sm:h-4 mr-1' />
          Abrir Caja
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-md w-[95vw] max-w-[95vw] sm:w-auto max-h-[90vh] flex flex-col p-0'>
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle className='text-lg sm:text-xl'>Nueva Caja</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='flex flex-col flex-1'>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className='space-y-4 sm:space-y-6'>
              <div>
                <Label htmlFor='monto_apertura' className='text-sm sm:text-base'>
                  Monto de Apertura
                </Label>
                <div className='relative'>
                  <Input
                    id='monto_apertura'
                    type='text'
                    placeholder='0'
                    value={displayValue}
                    onChange={e => handleInputChange(e.target.value)}
                    className='pl-10 text-sm sm:text-base'
                  />
                  <DollarSign className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
                </div>
                {errors.monto_apertura && (
                  <p className='text-xs sm:text-sm text-red-600 mt-1'>{errors.monto_apertura}</p>
                )}
              </div>
              <div>
                <Label htmlFor='fecha_apertura' className='text-sm sm:text-base'>
                  Fecha y Hora de Apertura
                </Label>
                <div className='relative'>
                  <Input
                    id='fecha_apertura'
                    type='text'
                    value={`${formatDateTimeDmyLabel(currentDateTime.toISOString()).date} ${formatDateTimeDmyLabel(currentDateTime.toISOString()).time}`}
                    readOnly
                    className='pl-10 text-sm sm:text-base'
                  />
                  <Calendar className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
                </div>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 border-t px-6 py-4">
            <div className='flex flex-col sm:flex-row justify-center gap-2 sm:gap-4'>
              <Button
                type='button'
                size='sm'
                variant='outline'
                className='rounded-full px-4 sm:px-6 hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto'
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                size='sm'
                variant='outline'
                className='rounded-full px-4 sm:px-6 bg-black text-white hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto'
                type='submit'
                disabled={loading}
              >
                {loading && <Loader2 className='h-3 w-3 sm:h-4 sm:w-4 mr-1 animate-spin' />}
                Abrir Caja
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

