import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ServicioWithDetails } from '@/types/servicio';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { useServiceAnulacionForm } from '@/hooks/services';

interface AnulacionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servicio: ServicioWithDetails | null;
  onConfirm: () => void | Promise<void>;
}

export function AnulacionServicioModal({
  open,
  onOpenChange,
  servicio,
  onConfirm
}: AnulacionModalProps) {
  const { motivo, setMotivo, isLoading, handleSubmit, handleCancel } = useServiceAnulacionForm({
    onOpenChange,
    servicio,
    onConfirm
  });

  return (
    <Dialog
      open={open}
      onOpenChange={value => {
        if (!isLoading) onOpenChange(value);
      }}
    >
      <DialogContent className='flex max-h-[90dvh] w-[calc(100vw-1rem)] max-w-md flex-col rounded-2xl border border-neutral-200 bg-white p-0 text-gray-900 shadow-xl dark:border-neutral-800 dark:bg-black dark:text-white'>
        <DialogHeader className='shrink-0 border-b border-neutral-200 p-4 pr-12 pb-3 dark:border-neutral-800 sm:p-6 sm:pr-14 sm:pb-3'>
          <DialogTitle className='text-gray-900 dark:text-gray-100'>
            Solicitar Anulación de Servicio
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='flex min-h-0 flex-1 flex-col'>
          <div className='min-h-0 flex-1 overflow-y-auto p-4 sm:p-6'>
            <div className='space-y-4'>
              {servicio && (
                <div className='space-y-2'>
                  <Label className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                    Servicio a anular:
                  </Label>
                  <div className='rounded-2xl border border-neutral-200 bg-gray-50 p-3 dark:border-neutral-800 dark:bg-neutral-900'>
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
                        <strong>Total:</strong> {formatCurrencyCLP(servicio.total || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className='space-y-2'>
                <Label
                  htmlFor='motivo'
                  className='text-sm font-medium text-gray-900 dark:text-gray-100'
                >
                  Motivo de la anulación *
                </Label>
                <Textarea
                  id='motivo'
                  placeholder='Ingrese el motivo de la anulación...'
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  className='min-h-[100px] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400'
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <div className='shrink-0 border-t border-neutral-200 p-4 dark:border-neutral-800 sm:p-6'>
            <div className='flex flex-col-reverse justify-center gap-2 sm:flex-row'>
              <Button
                type='button'
                variant='outline'
                onClick={handleCancel}
                disabled={isLoading}
                size='sm'
                className='w-full rounded-full transition-all duration-200 hover:scale-105 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black sm:w-auto'
              >
                Cancelar
              </Button>
              <Button
                type='submit'
                disabled={isLoading || !motivo.trim()}
                size='sm'
                variant='outline'
                className='w-full rounded-full bg-black text-white transition-all duration-200 hover:scale-105 dark:bg-white dark:text-black sm:w-auto'
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
