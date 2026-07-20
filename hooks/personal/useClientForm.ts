'use client';

/* eslint-disable react-hooks/incompatible-library */
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useEffect } from 'react';

const clientFormSchema = z.object({
  run: z.string().optional().or(z.literal('')),
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  lastName: z.string().min(2, 'Mínimo 2 caracteres'),
  phone: z.string().optional().or(z.literal(''))
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;

interface UseClientFormProps {
  clientData: ClientFormValues;
  onSubmit: (data: ClientFormValues) => void;
  open: boolean;
}

export const useClientForm = ({ clientData, onSubmit, open }: UseClientFormProps) => {
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: clientData
  });

  const { reset, handleSubmit, watch, setValue } = form;

  useEffect(() => {
    if (open) {
      reset(clientData);
    }
  }, [clientData, reset, open]);

  const capitalizeWords = (value?: string) => {
    if (!value) return '';

    const endsWithSpace = value.endsWith(' ');

    const transformed = value
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    return endsWithSpace ? transformed + ' ' : transformed;
  };

  const nameValue = watch('name');
  const lastNameValue = watch('lastName');

  useEffect(() => {
    if (nameValue) {
      const capitalized = capitalizeWords(nameValue);
      if (capitalized !== nameValue) {
        setValue('name', capitalized, { shouldValidate: true });
      }
    }
  }, [nameValue, setValue]);

  useEffect(() => {
    if (lastNameValue) {
      const capitalized = capitalizeWords(lastNameValue);
      if (capitalized !== lastNameValue) {
        setValue('lastName', capitalized, { shouldValidate: true });
      }
    }
  }, [lastNameValue, setValue]);

  const onFormSubmit = handleSubmit(data => {
    const cleanData = {
      ...data,
      name: data.name.trim(),
      lastName: data.lastName.trim(),
      run: data.run?.trim() || '',
      phone: data.phone?.trim() || ''
    };
    onSubmit(cleanData);
  });

  return {
    form,
    onFormSubmit,
    errors: form.formState.errors,
    register: form.register,
    setValue,
    isLoading: false
  };
};
