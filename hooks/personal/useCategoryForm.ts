/* eslint-disable react-hooks/incompatible-library */
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { CategorySchema, type CategoryType } from '@/lib/business/schemas/category';

interface UseCategoryFormProps {
  initialValues?: Partial<CategoryType>;
  onSubmit: (data: { name: string; description: string }) => Promise<void>;
  open: boolean;
}

export const useCategoryForm = ({ initialValues, onSubmit, open }: UseCategoryFormProps) => {
  const form = useForm<CategoryType>({
    resolver: zodResolver(CategorySchema),
    defaultValues: {
      name: initialValues?.name ?? '',
      description: initialValues?.description ?? '',
      id: initialValues?.id,
    },
    mode: 'onChange',
  });

  const { reset, handleSubmit, watch, setValue } = form;

  useEffect(() => {
    if (open) {
      reset({
        name: initialValues?.name ?? '',
        description: initialValues?.description ?? '',
        id: initialValues?.id,
      });
    }
  }, [initialValues, reset, open]);

  const capitalizeWords = (value: string = '') => {
    const endsWithSpace = value.endsWith(' ');
    const transformed = value
      .trim()
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    return endsWithSpace ? transformed + ' ' : transformed;
  };

  const capitalizeFirst = (text: string = '') => {
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const nameValue = watch('name');
  const descriptionValue = watch('description');

  useEffect(() => {
    if (nameValue) {
      const capitalized = capitalizeWords(nameValue);
      if (capitalized !== nameValue) {
        setValue('name', capitalized, { shouldValidate: true });
      }
    }
  }, [nameValue, setValue]);

  useEffect(() => {
    if (descriptionValue) {
      const capitalized = capitalizeFirst(descriptionValue);
      if (capitalized !== descriptionValue) {
        setValue('description', capitalized, { shouldValidate: true });
      }
    }
  }, [descriptionValue, setValue]);

  const onFormSubmit = handleSubmit(async (data) => {
    await onSubmit({
      name: data.name.trim(),
      description: data.description.trim(),
    });
  });

  return {
    form,
    onFormSubmit,
    errors: form.formState.errors,
    register: form.register,
    isValid: form.formState.isValid,
    isSubmitting: form.formState.isSubmitting,
  };
};
