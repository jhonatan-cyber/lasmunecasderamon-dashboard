import { AlertTriangle, Loader2, Database } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface CleanDatabaseConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function CleanDatabaseConfirmModal({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false
}: CleanDatabaseConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px] flex flex-col p-0 overflow-hidden rounded-2xl max-h-[90vh]'>
        <DialogHeader className='shrink-0 px-6 pt-6 pb-4 border-b dark:border-slate-800'>
          <DialogTitle className='flex items-center gap-2'>
            <AlertTriangle className='text-red-500 w-5 h-5' />
            <span className='text-gray-900 dark:text-neutral-100'>¿Vaciar base de datos?</span>
          </DialogTitle>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-6'>
          <div className='text-left'>
            <p className='font-medium text-gray-900 dark:text-neutral-100 mb-4 text-center'>
              ¿Estás seguro de que querés vaciar la base de datos?
            </p>

            <div className='bg-red-50 dark:bg-red-950/40 p-4 rounded-xl border border-red-200 dark:border-red-800'>
              <div className='space-y-2 text-sm text-red-900 dark:text-red-100'>
                <p className='text-center'>
                  <span className='text-base font-bold'>Se eliminarán todos los datos de:</span>
                </p>
                <ul className='list-disc list-inside text-xs text-red-600 dark:text-red-400 mt-2'>
                  <li>Ventas, pedidos y detalles</li>
                  <li>Clientes y prepago</li>
                  <li>Cajas, anticipos y propinas</li>
                  <li>Asistencias y servicios</li>
                </ul>
              </div>
            </div>

            <div className='mt-4 bg-green-50 dark:bg-green-950/40 p-4 rounded-xl border border-green-200 dark:border-green-800'>
              <p className='text-sm text-green-900 dark:text-green-100 text-center'>
                <span className='font-bold'>Se conservarán:</span>
              </p>
              <ul className='list-disc list-inside text-xs text-green-600 dark:text-green-400 mt-2'>
                <li>Usuarios</li>
                <li>Roles</li>
                <li>Permissions</li>
                <li>Configuraciones</li>
                <li>Habitaciones</li>
                <li>Productos</li>
                <li>Categorias</li>
                <li>Codigos</li>
                <li>Relacion roles-permisos</li>
              </ul>
            </div>

            <p className='mt-4 text-xs text-red-500 dark:text-red-400 font-medium text-center uppercase tracking-wider'>
              Esta acción no se puede revertir
            </p>
            <p className='mt-2 text-xs text-blue-600 dark:text-blue-300 font-medium text-center'>
              Se creará un backup automático antes de vaciar.
            </p>
          </div>
        </div>

        <div className='shrink-0 border-t px-6 py-4 bg-gray-50 dark:bg-slate-900/50 rounded-b-2xl'>
          <div className='flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 w-full'>
            <Button
              variant='outline'
              className='flex items-center gap-2 rounded-full hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black px-6 text-sm sm:text-base w-full sm:w-auto'
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              variant='outline'
              disabled={isLoading}
              className='flex items-center bg-red-600 text-white dark:bg-red-600 dark:text-white gap-2 rounded-full px-6 hover:scale-105 transition-all duration-200 w-full sm:w-auto hover:bg-red-700 dark:hover:bg-red-700 text-sm sm:text-base'
            >
              {isLoading ? (
                <div className='flex items-center gap-2'>
                  <Loader2 className='w-4 h-4 animate-spin' />
                  <span>Limpiando...</span>
                </div>
              ) : (
                <>
                  <Database className='w-4 h-4' />
                  Sí, vaciar todo
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
