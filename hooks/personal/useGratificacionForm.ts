import { useForm, Controller } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEmployees } from '@/hooks/personal/useEmployees';
import { Gratificacion } from '@/types/gratificacion';

const gratificacionFormSchema = z.object({
  usuario_id: z.string().min(1, 'Seleccionar un empleado es obligatorio'),
  monto: z.string().refine(val => parseFloat(val.replace(/\./g, '')) > 0, 'El monto debe ser mayor a 0'),
  descripcion: z.string().default(''),
});

export type GratificacionFormValues = z.infer<typeof gratificacionFormSchema>;

interface UseGratificacionFormProps {
  gratificacion: Gratificacion | null;
  open: boolean;
  onSubmit: (data: { usuario_id: string | number; monto: number; descripcion: string }) => void;
}

export function useGratificacionForm({ gratificacion, open, onSubmit }: UseGratificacionFormProps) {
  const { data: employeesResponse } = useEmployees();
  const employees = employeesResponse?.data || [];
  const [searchEmployee, setSearchEmployee] = useState('');

  const form = useForm<any>({
    resolver: zodResolver(gratificacionFormSchema),
    defaultValues: { usuario_id: '', monto: '', descripcion: '' } as any,
  });

  const { reset, watch, setValue, handleSubmit, formState: { errors }, control } = form;

  useEffect(() => {
    if (open) {
      if (gratificacion) {
        reset({
          usuario_id: String(gratificacion.usuario_id),
          monto: String(gratificacion.monto).replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
          descripcion: gratificacion.descripcion || '',
        });
      } else {
        reset({ usuario_id: '', monto: '', descripcion: '' });
      }
    }
  }, [gratificacion, open, reset]);

  const watchedDescription = watch('descripcion');
  const watchedMonto = watch('monto');
  const watchedUserId = watch('usuario_id');

  useEffect(() => {
    if (!watchedDescription) return;
    const cap = watchedDescription.charAt(0).toUpperCase() + watchedDescription.slice(1);
    if (cap !== watchedDescription) setValue('descripcion', cap, { shouldDirty: true, shouldValidate: true });
  }, [watchedDescription, setValue]);

  const handleFormSubmit = (data: GratificacionFormValues) => {
    onSubmit({
      usuario_id: data.usuario_id,
      monto: parseFloat(data.monto.replace(/\./g, '')),
      descripcion: data.descripcion?.trim() ?? '',
    });
  };

  const eligibleEmployees = employees.filter((u: any) => u.status === 1 || u.status === undefined || u.status === null);
  const filteredEmployees = eligibleEmployees.filter((u: any) =>
    `${u.name} ${u.lastName} ${u.nick || ''}`.toLowerCase().includes(searchEmployee.toLowerCase())
  );

  return {
    register: form.register,
    control,
    errors,
    watchedMonto,
    watchedUserId,
    searchEmployee,
    setSearchEmployee,
    filteredEmployees,
    eligibleEmployees,
    onFormSubmit: handleSubmit(handleFormSubmit),
  };
}
