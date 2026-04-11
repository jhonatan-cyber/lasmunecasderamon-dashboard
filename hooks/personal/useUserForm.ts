import { useForm } from 'react-hook-form';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User as UserType } from '@/types/user';
import { useRoles } from '@/hooks/personal/useRoles';
import { useNumberFormatter } from '@/hooks/shared/useNumberFormatter';

export const userFormSchema = z.object({
  run: z.string().min(8, 'El RUN es requerido'),
  nick: z.string().min(3, 'El nick debe tener al menos 3 caracteres'),
  name: z.string().min(2, 'El nombre es requerido'),
  lastName: z.string().min(2, 'El apellido es requerido'),
  address: z.string().min(5, 'La dirección es requerida'),
  phone: z.string().min(8, 'El teléfono es requerido'),
  maritalStatus: z.string().min(1, 'El estado civil es requerido'),
  afp: z.string().min(2, 'El establecimiento de aporte es requerido'),
  salary: z.number().min(0, 'El sueldo no puede ser negativo'),
  contributions: z.number().min(0, 'El aporte no puede ser negativo'),
  discount: z.number().min(0, 'El descuento no puede ser negativo'),
  housing_discount: z.boolean(),
  rol_id: z.string().min(1, 'El rol es requerido'),
  correo: z.string().optional(),
  password: z.string().optional(),
  foto: z.string().optional(),
  foto_anterior: z.string().optional()
});

export type UserFormValues = z.infer<typeof userFormSchema>;

interface UseUserFormProps {
  user?: UserType;
  onSubmit: (values: UserFormValues, file?: File) => void;
  isEditMode?: boolean;
}

export function useUserForm({ user, onSubmit, isEditMode }: UseUserFormProps) {
  const { roles, isLoading: isLoadingRoles } = useRoles();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sueldo = useNumberFormatter(user?.salary || 0);
  const aporte = useNumberFormatter(user?.contributions || 0);
  const descuento = useNumberFormatter(user?.discount || 0);

  const mapEstadoCivilToSelect = useCallback((estadoCivil: string | undefined): string => {
    if (!estadoCivil) return '';
    const estado = estadoCivil.toLowerCase();
    if (estado.includes('soltero') || estado.includes('soltera')) return 'Soltero';
    if (estado.includes('casado') || estado.includes('casada')) return 'Casado';
    if (estado.includes('divorciado') || estado.includes('divorciada')) return 'Divorciado';
    if (estado.includes('viudo') || estado.includes('viuda')) return 'Viudo';
    if (estado.includes('separado') || estado.includes('separada')) return 'Separado';
    return estadoCivil;
  }, []);

  const mapSelectToEstadoCivil = useCallback((selectValue: string): string => {
    const mapping: Record<string, string> = {
      Soltero: 'Soltero/a',
      Casado: 'Casado/a',
      Divorciado: 'Divorciado/a',
      Viudo: 'Viudo/a',
      Separado: 'Separado/a'
    };
    return mapping[selectValue] || selectValue;
  }, []);

  const capitalizeWords = useCallback((value: string | undefined) => {
    if (!value) return '';
    return value
      .split(' ')
      .map(word => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ''))
      .join(' ');
  }, []);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: useMemo(
      () => ({
        run: user?.run || '',
        nick: user?.nick || '',
        name: user?.name || '',
        lastName: user?.lastName || '',
        address: user?.address || '',
        phone: user?.phone || '',
        maritalStatus: mapEstadoCivilToSelect(user?.maritalStatus),
        afp: user?.afp || '',
        salary: user?.salary || 0,
        contributions: user?.contributions || 0,
        discount: user?.discount || 0,
        rol_id: user?.rol_id ? user.rol_id.toString() : '',
        correo: '',
        password: '',
        foto: user?.foto || '',
        housing_discount: (user?.discount && user.discount > 0) || false
      }),
      [user, mapEstadoCivilToSelect]
    )
  });

  const watchedNick = form.watch('nick');
  const watchedName = form.watch('name');
  const watchedLastName = form.watch('lastName');
  const watchedAddress = form.watch('address');

  useEffect(() => {
    if (watchedNick) {
      const capitalized = capitalizeWords(watchedNick);
      if (watchedNick !== capitalized) {
        form.setValue('nick', capitalized, { shouldValidate: false });
      }
    }
  }, [watchedNick, form, capitalizeWords]);

  useEffect(() => {
    if (watchedName) {
      const capitalized = capitalizeWords(watchedName);
      if (watchedName !== capitalized) {
        form.setValue('name', capitalized, { shouldValidate: false });
      }
    }
  }, [watchedName, form, capitalizeWords]);

  useEffect(() => {
    if (watchedLastName) {
      const capitalized = capitalizeWords(watchedLastName);
      if (watchedLastName !== capitalized) {
        form.setValue('lastName', capitalized, { shouldValidate: false });
      }
    }
  }, [watchedLastName, form, capitalizeWords]);

  useEffect(() => {
    if (watchedAddress) {
      const capitalized = watchedAddress.charAt(0).toUpperCase() + watchedAddress.slice(1);
      if (watchedAddress !== capitalized) {
        form.setValue('address', capitalized);
      }
    }
  }, [watchedAddress, form]);

  useEffect(() => {
    if (user) {
      form.reset({
        run: user.run || '',
        nick: user.nick || '',
        name: user.name || '',
        lastName: user.lastName || '',
        address: user.address || '',
        phone: user.phone || '',
        maritalStatus: mapEstadoCivilToSelect(user.maritalStatus),
        afp: user.afp || '',
        salary: user.salary || 0,
        contributions: user.contributions || 0,
        discount: user.discount || 0,
        rol_id: user.rol_id ? user.rol_id.toString() : '',
        correo: '',
        password: '',
        foto: user.foto || '',
        housing_discount: (user.discount && user.discount > 0) || false
      });
      sueldo.setFormattedValue(user.salary ? sueldo.formatNumber(user.salary) : '');
      aporte.setFormattedValue(user.contributions ? aporte.formatNumber(user.contributions) : '');
      descuento.setFormattedValue(user.discount ? descuento.formatNumber(user.discount) : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, form, mapEstadoCivilToSelect]);

  const handleFormSubmit = async (values: UserFormValues) => {
    try {
      setIsSubmitting(true);

      if (!values.name || !values.lastName) {
        form.setError('name', {
          type: 'manual',
          message: !values.name ? 'El nombre es requerido' : ''
        });
        form.setError('lastName', {
          type: 'manual',
          message: !values.lastName ? 'El apellido es requerido' : ''
        });
        return;
      }

      if (imageFile) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(imageFile.type)) {
          form.setError('foto', {
            type: 'manual',
            message: 'Solo se permiten archivos de imagen (JPG, PNG, GIF, WebP)'
          });
          return;
        }
        if (imageFile.size > 5 * 1024 * 1024) {
          form.setError('foto', { type: 'manual', message: 'La imagen no puede superar los 5MB' });
          return;
        }
      }

      const processedValues = { ...values };
      processedValues.nick = capitalizeWords(processedValues.nick).trim();
      processedValues.name = capitalizeWords(processedValues.name).trim();
      processedValues.lastName = capitalizeWords(processedValues.lastName).trim();
      processedValues.address = capitalizeWords(processedValues.address).trim();
      processedValues.salary = Number(sueldo.getNumericValue(sueldo.formattedValue)) || 0;
      processedValues.contributions = Number(aporte.getNumericValue(aporte.formattedValue)) || 0;
      processedValues.discount = Number(descuento.getNumericValue(descuento.formattedValue)) || 0;
      processedValues.maritalStatus = mapSelectToEstadoCivil(processedValues.maritalStatus);

      if (isEditMode && user && processedValues.run !== user.run) {
        processedValues.password = processedValues.run;
      }

      if (isEditMode && user && user.foto && !imageFile) {
        processedValues.foto_anterior = user.foto;
      }

      await onSubmit(processedValues, imageFile || undefined);
    } catch (error) {
      form.setError('root', { type: 'manual', message: 'Error al enviar el formulario.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    roles,
    isLoadingRoles,
    isSubmitting,
    imageFile,
    setImageFile,
    sueldo,
    aporte,
    descuento,
    handleFormSubmit: form.handleSubmit(handleFormSubmit)
  };
}
