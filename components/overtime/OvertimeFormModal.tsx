'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { UserSelect } from '@/components/shared/selects';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { useOvertimeForm } from '@/hooks/personal';
import { Timer, Banknote, Calculator, Loader2 } from 'lucide-react';

interface OvertimeFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { usuario_id: string; hora: number; monto: number }) => Promise<void>;
  isLoading?: boolean;
}

export default function OvertimeFormModal({
  isOpen,
  onOpenChange,
  onSubmit,
  isLoading = false
}: OvertimeFormModalProps) {
  const {
    employees,
    selectedUser,
    setSelectedUser,
    hora,
    setHora,
    montoDisplay,
    handleMontoChange,
    calculateTotal,
    handleSubmit
  } = useOvertimeForm({ onSubmit });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl'>
        <DialogHeader className='p-6 sm:p-8 pb-4 border-b bg-white dark:bg-slate-900'>
          <DialogTitle className='text-xl sm:text-2xl font-bold flex items-center gap-2'>
            <span>Registrar Hora Extra</span>
          </DialogTitle>
          <DialogDescription className='sr-only'>
            Formulario para registrar o editar horas extras del personal
          </DialogDescription>
        </DialogHeader>

        <div className='p-6 sm:p-8 bg-white dark:bg-slate-900'>
          <form onSubmit={handleSubmit} className='space-y-4 sm:space-y-6'>
            {/* SelecciÃ³n de Empleado */}
            <div>
              <Label className='text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300'>
                Empleado <span className='text-red-500'>*</span>
              </Label>
              <div className='mt-2'>
                <UserSelect
                  users={employees}
                  value={selectedUser}
                  onChange={setSelectedUser}
                  roles={['garzon', 'cajero']}
                  placeholder='Busca un empleado...'
                />
              </div>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6'>
              {/* Cantidad de Horas */}
              <div>
                <Label
                  htmlFor='hora'
                  className='text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300'
                >
                  Cantidad de Horas <span className='text-red-500'>*</span>
                </Label>
                <div className='relative mt-2'>
                  <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'>
                    <Timer className='w-4 h-4' />
                  </span>
                  <Input
                    id='hora'
                    type='number'
                    step='0.5'
                    min='0.5'
                    max='24'
                    value={hora}
                    onChange={e => setHora(e.target.value)}
                    placeholder='Ej: 4.5'
                    className='pl-10 rounded-full bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 focus:ring-purple-500 h-10 sm:h-11'
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Precio por Hora */}
              <div>
                <Label
                  htmlFor='monto'
                  className='text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300'
                >
                  Precio por Hora <span className='text-red-500'>*</span>
                </Label>
                <div className='relative mt-2'>
                  <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'>
                    <Banknote className='w-4 h-4' />
                  </span>
                  <Input
                    id='monto'
                    type='text'
                    inputMode='numeric'
                    value={montoDisplay}
                    onChange={handleMontoChange}
                    placeholder='$ 0'
                    className='pl-10 rounded-full bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 focus:ring-purple-500 h-10 sm:h-11'
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Resultado Calculado */}
            {hora && montoDisplay && (
              <div className='p-4 bg-gray-100 dark:bg-slate-800 rounded-xl border border-gray-300 dark:border-gray-700 flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Calculator className='h-4 w-4 text-gray-400' />
                  <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                    Total
                  </span>
                </div>
                <div className='text-lg font-bold text-gray-900 dark:text-white'>
                  {formatCurrencyCLP(calculateTotal())}
                </div>
              </div>
            )}

            {/* Botones de acciÃ³n siguiendo la estructura de CategoryForm */}
            <div className='flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 w-full pt-4 border-t border-gray-100 dark:border-gray-800/50 mt-4'>
              <Button
                type='button'
                variant='outline'
                className='flex items-center gap-2 rounded-full px-8 hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black w-full sm:w-auto text-sm sm:text-base border-gray-200 dark:border-gray-800'
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type='submit'
                className='bg-black text-white dark:bg-black dark:text-white  dark:hover:!bg-white dark:hover:!text-black rounded-full px-8 hover:!bg-white hover:!text-black transition-all hover:scale-105 border-2'
                disabled={isLoading || !selectedUser || !hora || !montoDisplay}
              >
                {isLoading ? (
                  <div className='flex items-center gap-2'>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    <span>Guardando...</span>
                  </div>
                ) : (
                  'Guardar'
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}



