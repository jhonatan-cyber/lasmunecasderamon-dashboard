import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Controller } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { Gratificacion } from '@/types/gratificacion';
import { useGratificacionForm } from '@/hooks/personal';
import { UserSelect } from '@/components/shared/selects';

interface GratificacionesFormProps {
  isEditMode: boolean;
  gratificacion: Gratificacion | null;
  open: boolean;
  isLoading: boolean;
  onSubmit: (data: { usuario_id: string | number; monto: number; descripcion: string }) => void;
  onCancel: () => void;
  hideButtons?: boolean;
}

export function GratificacionesForm({
  isEditMode,
  gratificacion,
  open,
  isLoading,
  onSubmit,
  onCancel,
  hideButtons = false
}: GratificacionesFormProps) {
  const {
    register,
    control,
    errors,
    watchedMonto,
    watchedUserId,
    eligibleEmployees,
    onFormSubmit
  } = useGratificacionForm({ gratificacion, open, onSubmit });

  return (
    <form id='gratificaciones-form' onSubmit={onFormSubmit} className='space-y-4 sm:space-y-6'>
      <div>
        <Controller
          name='usuario_id'
          control={control}
          rules={{ required: true }}
          render={({ field }) => (
            <UserSelect
              users={eligibleEmployees}
              value={field.value}
              onChange={field.onChange}
              label='Empleado'
              placeholder='Selecciona un empleado'
              searchPlaceholder='Buscar empleado...'
              disabled={isLoading || isEditMode}
              onlyActive={true}
              required={true}
            />
          )}
        />
        {isEditMode ? (
          <p className='text-xs text-muted-foreground mt-1'>
            El empleado no se puede modificar al editar una gratificación.
          </p>
        ) : (
          errors.usuario_id && (
            <p className='text-red-600 text-xs mt-1'>Seleccionar un empleado es obligatorio</p>
          )
        )}
      </div>

      <div>
        <Label htmlFor='monto' className='mb-2 text-sm font-semibold'>
          Monto <span className='text-red-500'>*</span>
        </Label>
        <div className='relative'>
          <span className='absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500'>$</span>
          <Controller
            name='monto'
            control={control}
            rules={{
              required: 'El monto es obligatorio',
              validate: val =>
                parseFloat(String(val).replace(/\./g, '')) > 0 || 'El monto debe ser mayor a 0'
            }}
            render={({ field }) => (
              <Input
                id='monto'
                type='text'
                inputMode='numeric'
                value={field.value}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '');
                  field.onChange(v.replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
                }}
                placeholder='0'
                disabled={isLoading}
                className='pl-8 rounded-full h-11 text-sm sm:text-base'
              />
            )}
          />
        </div>
        {errors.monto && (
          <p className='text-red-600 text-xs mt-1'>{errors.monto.message as string}</p>
        )}
      </div>

      <div>
        <Label htmlFor='descripcion' className='mb-2 text-sm font-semibold'>
          Descripción
        </Label>
        <Textarea
          id='descripcion'
          {...register('descripcion')}
          placeholder='Detalles de la gratificación...'
          rows={3}
          disabled={isLoading}
          className='rounded-[20px] text-sm sm:text-base resize-none px-4 py-3'
        />
      </div>

      {watchedMonto && !errors.monto && (
        <div className='p-4 bg-zinc-50 dark:bg-neutral-900 rounded-2xl border border-zinc-200 dark:border-neutral-800 text-center'>
          <div className='text-sm text-zinc-600 dark:text-neutral-400'>
            <span className='font-bold text-zinc-900 dark:text-neutral-100'>
              Monto a registrar:
            </span>{' '}
            {formatCurrencyNoDecimals(parseFloat(watchedMonto.replace(/\./g, '')) || 0)}
          </div>
        </div>
      )}

      {!hideButtons && (
        <div className='flex flex-col sm:flex-row justify-center gap-2 w-full'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={onCancel}
            disabled={isLoading}
            className='rounded-full px-6 hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white w-full sm:w-auto'
          >
            Cancelar
          </Button>
          <Button
            type='submit'
            variant='outline'
            size='sm'
            disabled={isLoading || (!isEditMode && !watchedUserId) || !watchedMonto}
            className='bg-black text-white rounded-full px-6 hover:scale-105 transition-all duration-200 w-full sm:w-auto'
          >
            {isLoading ? (
              <>
                <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                Guardando...
              </>
            ) : isEditMode ? (
              'Guardar Cambios'
            ) : (
              'Guardar'
            )}
          </Button>
        </div>
      )}
    </form>
  );
}
