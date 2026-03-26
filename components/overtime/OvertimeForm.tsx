'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import GarzonSelect from '@/components/overtime/GarzonSelect';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { useOvertimeForm } from '@/hooks/personal/useOvertimeForm';

interface OvertimeFormProps {
  open: boolean;
  onSubmit: (data: { usuario_id: string; hora: number; monto: number }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  hideButtons?: boolean;
}

export function OvertimeForm({ open, onSubmit, onCancel, isLoading = false, hideButtons = false }: OvertimeFormProps) {
  const { employees, selectedUser, setSelectedUser, hora, setHora, montoDisplay, handleMontoChange, calculateTotal, handleSubmit } =
    useOvertimeForm({ onSubmit });

  return (
    <form id='overtime-form' onSubmit={handleSubmit} className='space-y-4 sm:space-y-6'>
      <div>
        <Label className='text-xs sm:text-sm font-medium'>Empleado <span className='text-red-500'>*</span></Label>
        <GarzonSelect users={employees} value={selectedUser} onChange={setSelectedUser} placeholder='Selecciona un empleado' />
      </div>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        <div>
          <Label htmlFor='hora' className='text-xs sm:text-sm font-medium'>Horas <span className='text-red-500'>*</span></Label>
          <Input id='hora' type='number' step='0.5' min='0.5' max='24' value={hora}
            onChange={e => setHora(e.target.value)} placeholder='0' className='mt-1 text-xs sm:text-sm' disabled={isLoading} />
          <p className='text-xs text-gray-500 mt-1'>Maximo 24 horas</p>
        </div>
        <div>
          <Label htmlFor='monto' className='text-xs sm:text-sm font-medium'>Precio por Hora <span className='text-red-500'>*</span></Label>
          <Input id='monto' type='text' inputMode='numeric' value={montoDisplay}
            onChange={handleMontoChange} placeholder='0' className='mt-1 text-xs sm:text-sm' disabled={isLoading} />
        </div>
      </div>
      {hora && montoDisplay && (
        <div className='p-3 sm:p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 text-center'>
          <div className='text-xs sm:text-sm text-blue-700 dark:text-blue-300'>
            <strong className='font-bold'>Total calculado:</strong> {formatCurrencyNoDecimals(calculateTotal())}
          </div>
        </div>
      )}
      {!hideButtons && (
        <div className='flex flex-col sm:flex-row justify-center gap-2 w-full'>
          <Button type='button' onClick={onCancel} disabled={isLoading} variant='outline' size='sm'
            className='rounded-full px-6 hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white w-full sm:w-auto'>
            Cancelar
          </Button>
          <Button type='submit' disabled={isLoading || !selectedUser || !hora || !montoDisplay} variant='outline' size='sm'
            className='rounded-full px-6 hover:scale-105 transition-all duration-200 bg-black text-white w-full sm:w-auto'>
            {isLoading ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      )}
    </form>
  );
}
