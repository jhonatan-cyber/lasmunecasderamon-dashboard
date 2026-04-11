/* eslint-disable react-hooks/incompatible-library */
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const roleFormSchema = z.object({
  name: z.string().min(3, 'Mínimo 3 caracteres'),
  description: z.string().min(5, 'Mínimo 5 caracteres')
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;

interface UseRoleFormProps {
  initialValues: RoleFormValues;
  open: boolean;
  onSubmit: (data: RoleFormValues) => void;
}

export function useRoleForm({ initialValues, open, onSubmit }: UseRoleFormProps) {
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: initialValues
  });

  const {
    reset,
    watch,
    setValue,
    handleSubmit,
    formState: { errors }
  } = form;

  useEffect(() => {
    if (open) reset(initialValues);
  }, [initialValues, open, reset]);

  const watchedName = watch('name');
  const watchedDescription = watch('description');

  useEffect(() => {
    if (!watchedName) return;
    const cap = watchedName
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    if (cap !== watchedName) setValue('name', cap, { shouldDirty: true, shouldValidate: true });
  }, [watchedName, setValue]);

  useEffect(() => {
    if (!watchedDescription) return;
    const cap = watchedDescription.charAt(0).toUpperCase() + watchedDescription.slice(1);
    if (cap !== watchedDescription)
      setValue('description', cap, { shouldDirty: true, shouldValidate: true });
  }, [watchedDescription, setValue]);

  return {
    register: form.register,
    errors,
    onFormSubmit: handleSubmit(onSubmit)
  };
}
