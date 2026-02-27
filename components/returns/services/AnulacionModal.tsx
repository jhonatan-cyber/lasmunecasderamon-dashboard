import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ServicioWithDetails } from '@/types/servicio';
import { solicitarAnulacionServicio } from '@/lib/serviciosUtils';
import { showSuccessToast, showErrorToast } from '@/lib/toastUtils';

interface AnulacionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servicio: ServicioWithDetails | null;
  onConfirm: () => void;
}

export function AnulacionModal({ open, onOpenChange, servicio, onConfirm }: AnulacionModalProps) {
  const [motivo, setMotivo] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!motivo.trim()) {
      showErrorToast('Por favor ingrese un motivo para la anulación');
      return;
    }

    if (!servicio) {
      showErrorToast('No se ha seleccionado ningún servicio');
      return;
    }

    setIsLoading(true);

    try {
      const result = await solicitarAnulacionServicio(servicio.id_servicio!, motivo);

      if (result.success) {
        showSuccessToast('Solicitud de anulación enviada al administrador');
        setMotivo('');
        onOpenChange(false);
        onConfirm();
      } else {
        showErrorToast(result.error || 'Error al enviar la solicitud de anulación');
      }
    } catch (error) {
      console.error('Error al solicitar anulación:', error);
      showErrorToast('Error de conexión al enviar la solicitud');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setMotivo('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px] max-h-[90vh] flex flex-col p-0'>
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b dark:border-gray-700">
          <DialogTitle className="text-gray-900 dark:text-gray-100">Solicitar Anulación de Servicio</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='flex flex-col flex-1'>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className='space-y-4'>
              {servicio && (
                <div className='space-y-2'>
                  <Label className='text-sm font-medium text-gray-900 dark:text-gray-100'>Servicio a anular:</Label>
                  <div className='p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700'>
                    <div className='text-sm text-gray-600 dark:text-gray-300'>
                      <p>
                        <strong>Código:</strong> {servicio.codigo}
                      </p>
                      <p>
                        <strong>Cliente:</strong> {servicio.cliente_nombre || 'N/A'}
                      </p>
                      <p>
                        <strong>Habitación:</strong> {servicio.habitacion_numero || 'N/A'}
                      </p>
                      <p>
                        <strong>Total:</strong> ${servicio.total?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className='space-y-2'>
                <Label htmlFor='motivo' className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                  Motivo de la anulación *
                </Label>
                <Textarea
                  id='motivo'
                  placeholder='Ingrese el motivo de la anulación...'
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  className='min-h-[100px] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400'
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 border-t dark:border-gray-700 px-6 py-4">
            <div className='flex justify-end space-x-2'>
              <Button
                type='button'
                variant='outline'
                onClick={handleCancel}
                disabled={isLoading}
                size='sm'
                className='rounded-full hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
              >
                Cancelar
              </Button>
              <Button
                type='submit'
                disabled={isLoading || !motivo.trim()}
                size='sm'
                variant='outline'
                className='bg-black dark:bg-white text-white dark:text-black rounded-full hover:scale-105 transition-all duration-200'
              >
                {isLoading ? 'Enviando...' : 'Enviar Solicitud'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
