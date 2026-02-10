import { useForm } from 'react-hook-form';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User as UserType } from '@/types/user';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  CreditCard,
  UserCircle,
  User,
  FileSignature,
  Phone,
  MapPin,
  UserCheck,
  Home,
  DollarSign,
  Coins,
  Users
} from 'lucide-react';
import { useRoles } from '@/hooks/personal/useRoles';
import { useNumberFormatter } from '@/hooks/shared/useNumberFormatter';
import { FormFieldWithIcon } from './FormFieldWithIcon';
import { ImageUploadField } from './ImageUploadField';
import { NumberInputField } from './NumberInputField';

const userFormSchema = z.object({
  run: z.string().min(8, 'El RUN es requerido'),
  nick: z.string().min(3, 'El nick debe tener al menos 3 caracteres'),
  nombre: z.string().min(2, 'El nombre es requerido'),
  apellido: z.string().min(2, 'El apellido es requerido'),
  direccion: z.string().min(5, 'La dirección es requerida'),
  telefono: z.string().min(8, 'El teléfono es requerido'),
  estado_civil: z.string().min(1, 'El estado civil es requerido'),
  afp: z.string().min(2, 'El establecimiento de aporte es requerido'),
  sueldo: z.number().min(0, 'El sueldo no puede ser negativo'),
  aporte: z.number().min(0, 'El aporte no puede ser negativo'),
  descuento: z.number().min(0, 'El descuento no puede ser negativo'),
  housing_discount: z.boolean(),
  rol_id: z.string().min(1, 'El rol es requerido'),
  correo: z.string().optional(), // Completamente opcional, sin validación de email
  password: z.string().optional(),
  foto: z.string().optional(),
  foto_anterior: z.string().optional()
});
export type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormProps {
  user?: UserType;
  onSubmit: (values: UserFormValues, file?: File) => void;
  onCancel: () => void;
  isEditMode?: boolean;
  hideButtons?: boolean;
}

export function UserForm({ user, onSubmit, onCancel, isEditMode, hideButtons = false }: UserFormProps) {
  const { roles, isLoading: isLoadingRoles } = useRoles();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


  const sueldo = useNumberFormatter(user?.salary || 0);
  const aporte = useNumberFormatter(user?.contributions || 0);
  const descuento = useNumberFormatter(user?.discount || 0);


  useEffect(() => {


  }, [roles]);

  // Funciones memoizadas para mapeo de estado civil
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
      'Soltero': 'Soltero/a',
      'Casado': 'Casado/a',
      'Divorciado': 'Divorciado/a',
      'Viudo': 'Viudo/a',
      'Separado': 'Separado/a'
    };
    return mapping[selectValue] || selectValue;
  }, []);

  // Inicializar valores formateados cuando cambia el usuario
  useEffect(() => {
    if (user) {
      sueldo.setFormattedValue(user.salary ? sueldo.formatNumber(user.salary) : '');
      aporte.setFormattedValue(user.contributions ? aporte.formatNumber(user.contributions) : '');
      descuento.setFormattedValue(user.discount ? descuento.formatNumber(user.discount) : '');
    }
  }, [user, sueldo, aporte, descuento]);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: useMemo(() => ({
      run: user?.run || '',
      nick: user?.nick || '',
      nombre: user?.name || '',
      apellido: user?.lastName || '',
      direccion: user?.address || '',
      telefono: user?.phone || '',
      estado_civil: mapEstadoCivilToSelect(user?.maritalStatus),
      afp: user?.afp || '',
      sueldo: user?.salary || 0,
      aporte: user?.contributions || 0,
      descuento: user?.discount || 0,
      rol_id: user?.roleId ? user.roleId.toString() : '',
      correo: '',
      password: '',
      foto: user?.foto || '',
      housing_discount: (user?.discount && user.discount > 0) || false
    }), [user, mapEstadoCivilToSelect])
  });

  const housingDiscount = form.watch('housing_discount');

  const handleFormSubmit = useCallback(async (values: UserFormValues) => {

    try {
      setIsSubmitting(true);

      // Verificar que los campos nombre y apellido estén presentes
      if (!values.nombre || !values.apellido) {

        form.setError('nombre', {
          type: 'manual',
          message: !values.nombre ? 'El nombre es requerido' : ''
        });
        form.setError('apellido', {
          type: 'manual',
          message: !values.apellido ? 'El apellido es requerido' : ''
        });
        return;
      }

      // Verificar si hay una imagen para enviar
      if (imageFile) {


        // Verificar tipo de archivo nuevamente
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(imageFile.type)) {

          form.setError('foto', {
            type: 'manual',
            message: 'Solo se permiten archivos de imagen (JPG, PNG, GIF)'
          });
          return;
        }

        // Verificar tamaño nuevamente
        if (imageFile.size > 5 * 1024 * 1024) {

          form.setError('foto', {
            type: 'manual',
            message: 'La imagen no puede superar los 5MB'
          });
          return;
        }
      } else {
        console.log('No hay imagen para enviar');
      }


      const processedValues = { ...values };
      processedValues.sueldo = Number(sueldo.getNumericValue(sueldo.formattedValue)) || 0;
      processedValues.aporte = Number(aporte.getNumericValue(aporte.formattedValue)) || 0;
      processedValues.descuento = Number(descuento.getNumericValue(descuento.formattedValue)) || 0;


      processedValues.estado_civil = mapSelectToEstadoCivil(processedValues.estado_civil);


      if (isEditMode && user && processedValues.run !== user.run) {
        processedValues.password = processedValues.run;
      }


      if (isEditMode && user && user.foto && !imageFile) {
        processedValues.foto_anterior = user.foto;
      }

      await onSubmit(processedValues, imageFile || undefined);
    } catch (error) {


      form.setError('root', {
        type: 'manual',
        message: 'Error al enviar el formulario. Por favor, inténtelo de nuevo.'
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [imageFile, isEditMode, user, onSubmit, sueldo, aporte, descuento, mapSelectToEstadoCivil, form]);


  return (
    <Form {...form}>
      <form id='user-form' onSubmit={form.handleSubmit(handleFormSubmit)} className='space-y-4 sm:space-y-6'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start'>
          <div className='flex flex-col gap-4 sm:gap-6'>
            {/* RUN */}
            <FormFieldWithIcon
              control={form.control}
              name='run'
              label='RUN'
              placeholder='Run del usuario'
              icon={CreditCard}
            />

            {/* Nick */}
            <FormFieldWithIcon
              control={form.control}
              name='nick'
              label='Nick'
              placeholder='Nick del usuario'
              icon={UserCircle}
            />
          </div>

          {/* Imagen */}
          <ImageUploadField
            control={form.control}
            initialImageUrl={user?.foto}
            onImageChange={setImageFile}
          />
        </div>

        {/* Segunda fila: todos los demás campos, ocupa 2 columnas */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6'>
          {/* Nombre */}
          <FormFieldWithIcon
            control={form.control}
            name='nombre'
            label='Nombre'
            placeholder='Nombre(s)'
            icon={User}
          />

          {/* Apellido */}
          <FormFieldWithIcon
            control={form.control}
            name='apellido'
            label='Apellido'
            placeholder='Apellido(s)'
            icon={FileSignature}
          />

          {/* Dirección - ocupa 2 columnas */}
          <div className='lg:col-span-2'>
            <FormFieldWithIcon
              control={form.control}
              name='direccion'
              label='Dirección'
              placeholder='Dirección completa'
              icon={MapPin}
            />
          </div>

          {/* Teléfono */}
          <FormFieldWithIcon
            control={form.control}
            name='telefono'
            label='Teléfono'
            placeholder='Telefono'
            icon={Phone}
          />

          {/* Estado Civil */}
          <FormField
            control={form.control}
            name='estado_civil'
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel className='text-sm sm:text-base'>Estado Civil</FormLabel>
                  <div className='relative'>
                    <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600'>
                      <UserCheck />
                    </span>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className='pl-12 rounded-full'>
                          <SelectValue placeholder='Seleccione estado civil' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='Soltero'>Soltero/a</SelectItem>
                        <SelectItem value='Casado'>Casado/a</SelectItem>
                        <SelectItem value='Divorciado'>Divorciado/a</SelectItem>
                        <SelectItem value='Viudo'>Viudo/a</SelectItem>
                        <SelectItem value='Separado'>Separado/a</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          {/* AFP */}
          <FormField
            control={form.control}
            name='afp'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Establecimiento de Aporte</FormLabel>
                <div className='relative'>
                  <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600'>
                    <Home />
                  </span>
                  <FormControl>
                    <Input className='pl-12' placeholder='Establecimiento AFP' {...field} />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Rol */}
          <FormField
            control={form.control}
            name='rol_id'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rol</FormLabel>
                <div className='relative'>
                  <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600'>
                    <Users />
                  </span>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoadingRoles}
                  >
                    <FormControl>
                      <SelectTrigger className='pl-12 rounded-full'>
                        <SelectValue
                          placeholder={isLoadingRoles ? 'Cargando roles...' : 'Seleccione un rol'}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(roles || [])
                        .filter(role => role.status === 1)
                        .map(role => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            {role.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Sueldo */}
          <NumberInputField
            control={form.control}
            name='sueldo'
            label='Monto en Sueldo'
            icon={DollarSign}
            formattedValue={sueldo.formattedValue}
            onValueChange={sueldo.handleChange}
          />

          {/* Aporte AFP */}
          <NumberInputField
            control={form.control}
            name='aporte'
            label='Monto en Aporte AFP'
            icon={Coins}
            formattedValue={aporte.formattedValue}
            onValueChange={aporte.handleChange}
          />

          {/* Descuento de Alojamiento */}
          <div className='md:col-span-2 space-y-2'>
            <FormField
              control={form.control}
              name='housing_discount'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                  <div className='space-y-0.5'>
                    <FormLabel className='text-base'>Descuento por Alojamiento</FormLabel>
                    <FormDescription>
                      Activar si el empleado tiene descuento por alojamiento
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Conditional Discount Amount Field */}
            {form.watch('housing_discount') && (
              <NumberInputField
                control={form.control}
                name='descuento'
                label='Monto en Descuento'
                icon={DollarSign}
                formattedValue={descuento.formattedValue}
                onValueChange={descuento.handleChange}
              />
            )}
          </div>
        </div>

        {/* Botones - solo mostrar si hideButtons es false */}
        {!hideButtons && (
          <div className='flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 w-full'>
            <Button
              type='button'
              size='default'
              className='flex items-center gap-2 rounded-full hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white text-sm sm:text-base w-full sm:w-auto'
              variant='outline'
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type='submit'
              disabled={isSubmitting}
              size='default'
              className='flex items-center bg-black text-white gap-2 rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto'
              variant='outline'
            >
              {isSubmitting ? 'Guardando...' : isEditMode ? 'Actualizar' : 'Guardar'}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
