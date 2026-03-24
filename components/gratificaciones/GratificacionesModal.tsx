/* eslint-disable */
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { User as UserIcon, Loader2, DollarSign } from 'lucide-react';
import { useEmployees } from '@/hooks/personal/useEmployees';
import { formatCurrencyNoDecimals } from '@/lib/formatters';

interface GratificacionesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditMode: boolean;
  gratificacion: { usuario_id: string | number; monto: string | number; descripcion: string; usuario?: string } | null;
  isLoading: boolean;
  onSubmit: (data: { usuario_id: string | number; monto: number; descripcion: string }) => void;
  onCancel: () => void;
}

export function GratificacionesModal({
  open,
  onOpenChange,
  isEditMode,
  gratificacion,
  isLoading,
  onSubmit,
  onCancel
}: GratificacionesModalProps) {
  const { data: employeesResponse } = useEmployees();
  const employees = employeesResponse?.data || [];
  const [searchEmployee, setSearchEmployee] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    control
  } = useForm({
    defaultValues: {
      usuario_id: gratificacion?.usuario_id ? String(gratificacion.usuario_id) : '',
      monto: gratificacion?.monto ? String(gratificacion.monto).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '',
      descripcion: gratificacion?.descripcion || ''
    }
  });



  React.useEffect(() => {
    if (gratificacion) {
      reset({
        usuario_id: String(gratificacion.usuario_id),
        monto: String(gratificacion.monto).replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
        descripcion: gratificacion.descripcion || ''
      });
    } else {
      reset({
        usuario_id: '',
        monto: '',
        descripcion: ''
      });
    }
  }, [gratificacion, reset, open]);

  // Capitalizar solo la primera letra del total del texto
  const capitalizeFirst = (value?: string) => {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const watchedDescription = watch('descripcion');
  const watchedMonto = watch('monto');
  const watchedUserId = watch('usuario_id');

  React.useEffect(() => {
    const cap = capitalizeFirst(watchedDescription);
    if (watchedDescription !== undefined && cap !== watchedDescription) {
      setValue('descripcion', cap, { shouldDirty: true, shouldValidate: true });
    }
  }, [watchedDescription, setValue]);



  const handleFormSubmit = (data: any) => {
    const numericMonto = parseFloat(data.monto.replace(/\./g, ''));
    onSubmit({
      usuario_id: data.usuario_id,
      monto: numericMonto,
      descripcion: data.descripcion.trim()
    });
  };

  const eligibleEmployees = (employees || []).filter((u: any) => {
    const isActive = u.status === 1 || u.status === undefined || u.status === null;
    return isActive;
  });

  const filteredEmployees = eligibleEmployees.filter((u: any) =>
    `${u.name} ${u.lastName} ${u.nick || ''}`.toLowerCase().includes(searchEmployee.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[95vw] max-w-[95vw] sm:w-full sm:max-w-[500px] max-h-[90vh] flex flex-col p-0'>
        <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b'>
          <DialogTitle className='text-lg sm:text-xl lg:text-2xl font-bold'>
            {isEditMode ? 'Editar Gratificación' : 'Nueva Gratificación'}
          </DialogTitle>
          {isEditMode && gratificacion?.usuario && (
            <p className='text-sm text-zinc-500 dark:text-neutral-400 mt-1'>
              Para: {gratificacion.usuario}
            </p>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className='flex flex-col flex-1 min-h-0 overflow-hidden'>
          <div className='flex-1 overflow-y-auto px-6 py-4'>
            <div className='space-y-4 sm:space-y-6'>
              {!isEditMode && (
                <div>
                  <Label htmlFor='usuario_id' className='mb-2 text-sm font-semibold'>
                    Empleado <span className='text-red-500'>*</span>
                  </Label>
                  <Controller
                    name="usuario_id"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-full rounded-full h-11">
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-4 w-4 text-zinc-500" />
                            <SelectValue placeholder="Selecciona un empleado" />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <div className="p-2 pb-0">
                            <Input
                              placeholder="Buscar empleado..."
                              value={searchEmployee}
                              onChange={e => setSearchEmployee(e.target.value)}
                              className="mb-2 rounded-full"
                            />
                          </div>
                          {filteredEmployees.length === 0 && (
                            <div className="px-4 py-2 text-zinc-400 text-sm">
                              {eligibleEmployees.length === 0 ? "No hay empleados disponibles" : "Sin resultados"}
                            </div>
                          )}
                          {filteredEmployees.map((employee: any) => {
                            const employeeId = employee.id ?? employee.id_usuario;
                            return (
                              <SelectItem key={employeeId} value={String(employeeId)}>
                                {employee.name} {employee.lastName} {employee.nick ? `(${employee.nick})` : ''}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.usuario_id && (
                    <p className='text-red-600 text-xs sm:text-sm mt-1'>
                      Seleccionar un empleado es obligatorio
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor='monto' className='mb-2 text-sm font-semibold'>
                  Monto <span className='text-red-500'>*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <Controller
                    name="monto"
                    control={control}
                    rules={{ 
                      required: 'El monto es obligatorio',
                      validate: (val) => {
                        const num = parseFloat(String(val).replace(/\./g, ''));
                        return num > 0 || 'El monto debe ser mayor a 0';
                      }
                    }}
                    render={({ field }) => (
                      <Input
                        id='monto'
                        type='text'
                        inputMode='numeric'
                        value={field.value}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                          field.onChange(formatted);
                        }}
                        placeholder='0'
                        disabled={isLoading}
                        className='pl-8 rounded-full h-11 text-sm sm:text-base'
                      />
                    )}
                  />
                </div>
                {errors.monto && (
                  <p className='text-red-600 text-xs sm:text-sm mt-1'>
                    {errors.monto.message as string}
                  </p>
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
                <div className='p-4 bg-zinc-50 dark:bg-neutral-900 rounded-2xl border border-zinc-200 dark:border-neutral-800 text-center animate-in fade-in slide-in-from-top-2 duration-300'>
                  <div className='text-sm text-zinc-600 dark:text-neutral-400'>
                    <span className='font-bold text-zinc-900 dark:text-neutral-100'>Monto a registrar:</span>{' '}
                    {formatCurrencyNoDecimals(parseFloat(watchedMonto.replace(/\./g, '')) || 0)}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className='flex-shrink-0 border-t px-6 py-4 bg-white dark:bg-neutral-900'>
            <div className='flex flex-col sm:flex-row justify-center gap-2 w-full'>
              <DialogClose asChild>
                <button
                  type='button'
                  className='px-4 py-2 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 text-sm sm:text-base w-full sm:w-auto'
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  Cancelar
                </button>
              </DialogClose>
              <button
                type='submit'
                className='inline-flex items-center px-4 py-2 bg-black text-white rounded-full hover:bg-zinc-800 transition-colors duration-200 text-sm sm:text-base w-full sm:w-auto'
                disabled={isLoading || (!isEditMode && !watchedUserId) || !watchedMonto}
              >
                {isLoading ? (
                  <>
                    <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                    Guardando...
                  </>
                ) : (
                  isEditMode ? 'Guardar Cambios' : 'Guardar'
                )}
              </button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
