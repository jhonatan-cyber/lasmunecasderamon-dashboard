import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DollarSign, Loader2, AlertCircle } from 'lucide-react';
import { useAdvanceForm } from '@/hooks/personal';
import { UserSelect } from '@/components/shared/selects';

interface AdvanceFormProps {
  open: boolean;
  onSubmit: (data: { usuario_id: string; monto: string; motivo: string }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string | null;
  efectivoEnCaja?: number;
  hideButtons?: boolean;
}

export function AdvanceForm({
  open,
  onSubmit,
  onCancel,
  isLoading: externalLoading = false,
  error,
  efectivoEnCaja = 0,
  hideButtons = false
}: AdvanceFormProps) {
  const {
    users,
    selectedUser,
    setSelectedUser,
    montoDisplay,
    handleMontoChange,
    motivo,
    setMotivo,
    handleSubmit,
    balance,
    loadingBalance,
    isSubmitting
  } = useAdvanceForm({ open, onSubmit });
  const isLoading = externalLoading || isSubmitting;

  const rawMonto = Number(montoDisplay.replace(/\./g, ''));
  const exceedsCaja = rawMonto > efectivoEnCaja;
  const exceedsBalance = balance !== null && rawMonto > balance;

  const isFormValid = selectedUser && rawMonto > 0 && !exceedsBalance && !exceedsCaja && !isLoading;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const isInputsDisabled = Boolean(
    !selectedUser || isLoading || loadingBalance || (balance !== null && balance <= 0)
  );

  return (
    <form id='advance-form' onSubmit={handleSubmit} className='space-y-4 sm:space-y-6'>
      {}
      <div>
        <Label className='text-sm sm:text-base'>
          Empleado <span className='text-red-500'>*</span>
        </Label>
        <div className='relative mt-2'>
          <UserSelect
            users={users.map(u => ({
              ...u,
              nick: u.nick || '',
              role: u.role || '',
              status: u.status ?? 1
            }))}
            value={selectedUser}
            onChange={setSelectedUser}
            placeholder='Busca un empleado...'
            disabled={isLoading}
            onlyActive={false}
          />
        </div>

        {}
        {selectedUser && (
          <div
            className={`mt-3 flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs sm:text-sm font-semibold animate-in fade-in slide-in-from-top-1 duration-300 ${
              balance !== null && balance <= 0
                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/50'
                : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50'
            }`}
          >
            {loadingBalance ? (
              <>
                <Loader2 className='h-3 w-3 sm:h-4 sm:w-4 animate-spin' />
                <span>Calculando saldo disponible...</span>
              </>
            ) : balance !== null && balance <= 0 ? (
              <>
                <AlertCircle className='h-3 w-3 sm:h-4 sm:w-4' />
                <span>Sin saldo disponible para anticipo</span>
              </>
            ) : (
              <>
                <DollarSign className='h-3 w-3 sm:h-4 sm:w-4' />
                <span>Saldo disponible personal: {formatCurrency(balance || 0)}</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6'>
        {}
        <div className='space-y-2'>
          <Label htmlFor='monto' className='text-sm sm:text-base'>
            Monto <span className='text-red-500'>*</span>
          </Label>
          <div className='relative'>
            <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-600'>
              <DollarSign className='w-4 h-4' />
            </span>
            <Input
              id='monto'
              type='text'
              inputMode='numeric'
              value={montoDisplay}
              onChange={handleMontoChange}
              placeholder='0'
              className={`pl-10 sm:pl-12 rounded-full bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 ${exceedsCaja || exceedsBalance ? 'border-red-500 ring-red-500' : ''}`}
              disabled={isInputsDisabled}
            />
          </div>
          {exceedsCaja && (
            <div className='flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium animate-in fade-in slide-in-from-top-1'>
              <AlertCircle className='h-3.5 w-3.5' />
              <span>El monto supera el efectivo en caja: {formatCurrency(efectivoEnCaja)}</span>
            </div>
          )}
          {exceedsBalance && !exceedsCaja && (
            <div className='flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium animate-in fade-in slide-in-from-top-1'>
              <AlertCircle className='h-3.5 w-3.5' />
              <span>El monto supera el saldo disponible del empleado</span>
            </div>
          )}
        </div>

        {}
        <div className='space-y-2'>
          <Label htmlFor='motivo' className='text-sm sm:text-base'>
            Motivo <span className='text-gray-500 text-xs'>(Opcional)</span>
          </Label>
          <div className='relative'>
            <Input
              id='motivo'
              type='text'
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder='Ej: Adelanto sueldo'
              className='rounded-full bg-gray-100 dark:bg-slate-900/50 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100'
              disabled={isInputsDisabled}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className='rounded-2xl bg-red-50 dark:bg-red-900/20 p-4 flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-medium border border-red-100 dark:border-red-900/50'>
          <AlertCircle className='h-5 w-5' />
          <span>{error}</span>
        </div>
      )}

      {!hideButtons && (
        <div className='flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 w-full pt-4 border-t border-gray-100 dark:border-gray-800/50 mt-4'>
          <Button
            type='button'
            variant='outline'
            className='flex items-center gap-2 rounded-full hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black w-full sm:w-auto px-6 py-2 text-sm sm:text-base'
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type='submit'
            className='flex items-center bg-black text-white dark:bg-white dark:text-black gap-2 rounded-full hover:scale-105 transition-all duration-200 w-full sm:w-auto px-6 py-2 dark:hover:bg-gray-200 text-sm sm:text-base'
            disabled={isLoading || !isFormValid}
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
      )}
    </form>
  );
}
