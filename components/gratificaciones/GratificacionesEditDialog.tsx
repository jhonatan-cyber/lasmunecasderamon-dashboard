'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useGratificaciones } from '@/hooks/personal/useGratificaciones';
import { toast } from 'sonner';
import { formatCurrencyNoDecimals } from '@/lib/formatters';
import { Gratificacion } from '@/types/gratificacion';
import { DollarSign } from 'lucide-react';

interface GratificacionesEditDialogProps {
  open: boolean;
  onClose: () => void;
  gratificacion: Gratificacion;
  onSuccess?: () => void;
}

export default function GratificacionesEditDialog({ open, onClose, gratificacion, onSuccess }: GratificacionesEditDialogProps) {
  const { updateGratificacion } = useGratificaciones();
  const [monto, setMonto] = useState(gratificacion.monto.toString());
  const [descripcion, setDescripcion] = useState(gratificacion.descripcion);
  const [loading, setLoading] = useState(false);

  const formatNumber = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const getNumericValue = (formattedValue: string) => {
    return formattedValue.replace(/\./g, '');
  };

  const handleMontoChange = (value: string) => {
    setMonto(formatNumber(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numericMonto = getNumericValue(monto);
    
    if (!numericMonto) {
      toast.error('El monto es requerido');
      return;
    }

    const montoNum = parseFloat(numericMonto);

    if (montoNum <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    setLoading(true);
    try {
      await updateGratificacion({
        id: gratificacion.id,
        monto: montoNum,
        descripcion: descripcion.trim()
      });

      toast.success('Gratificación actualizada exitosamente');
      handleClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error al actualizar gratificación:', error);
      toast.error(error instanceof Error ? error.message : 'Error al actualizar la gratificación');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMonto(gratificacion.monto.toString());
    setDescripcion(gratificacion.descripcion);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='w-[95vw] max-w-[95vw] sm:w-auto sm:max-w-[500px] max-h-[90vh] flex flex-col p-0'>
        <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b'>
          <DialogTitle className='text-center text-lg sm:text-xl lg:text-2xl font-semibold'>
            Editar Gratificación
          </DialogTitle>
          <p className='text-center text-sm text-gray-500'>
            {gratificacion.usuario}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='flex flex-col h-full'>
          <div className='flex-1 overflow-y-auto px-6 py-4'>
            <div className='space-y-4 sm:space-y-6'>
              <div>
                <Label htmlFor='monto' className='text-xs sm:text-sm font-medium'>
                  Monto <span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='monto'
                  type='text'
                  inputMode='numeric'
                  value={monto}
                  onChange={(e) => handleMontoChange(e.target.value)}
                  placeholder='0'
                  className='mt-1 text-xs sm:text-sm'
                />
              </div>

              <div>
                <Label htmlFor='descripcion' className='text-xs sm:text-sm font-medium'>
                  Descripción
                </Label>
                <Textarea
                  id='descripcion'
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder='Ingresa una descripción opcional...'
                  className='mt-1 text-xs sm:text-sm'
                  rows={3}
                />
              </div>

              {monto && (
                <div className='p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200 text-center'>
                  <div className='text-xs sm:text-sm text-blue-700'>
                    <strong className='font-bold text-xs sm:text-sm'>Monto:</strong>{' '}
                    {formatCurrencyNoDecimals(parseFloat(getNumericValue(monto)) || 0)}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className='flex-shrink-0 border-t px-6 py-4'>
            <div className='flex flex-col sm:flex-row justify-center gap-2 w-full'>
              <Button
                type='button'
                onClick={handleClose}
                disabled={loading}
                variant='outline'
                size='sm'
                className='rounded-full px-4 sm:px-6 hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white text-xs sm:text-sm w-full sm:w-auto'
              >
                Cancelar
              </Button>
              <Button
                type='submit'
                disabled={loading || !monto}
                variant='outline'
                size='sm'
                className='rounded-full px-4 sm:px-6 hover:scale-105 transition-all duration-200 bg-black text-white text-xs sm:text-sm w-full sm:w-auto'
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
