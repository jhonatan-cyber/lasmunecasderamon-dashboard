import { useForm } from 'react-hook-form';
import { useState, useRef, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User } from '@/types/user';
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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faIdCard,
  faUserSecret,
  faUser,
  faSignature,
  faPhone,
  faMapLocationDot,
  faRestroom,
  faHotel,
  faMoneyBillTransfer,
  faHandHoldingDollar,
  faUsers,
  faMoneyBill1Wave,
  faImage,
  faTrash
} from '@fortawesome/free-solid-svg-icons';
import { Role } from '@/types/role';
// Esquema de validación con Zod
const userFormSchema = z.object({
  run: z.string().min(8, 'El RUN es requerido'),
  nick: z.string().min(3, 'El nick debe tener al menos 3 caracteres'),
  nombre: z.string().min(2, 'El nombre es requerido'),
  apellido: z.string().min(2, 'El apellido es requerido'),
  direccion: z.string().min(5, 'La dirección es requerida'),
  telefono: z.string().min(8, 'El teléfono es requerido'),
  estado_civil: z.string().min(1, 'El estado civil es requerido'),
  afp: z.string().min(2, 'El establecimiento de aporte es requerido'),
  sueldo: z.number().min(0, 'El sueldo no puede ser negativo').default(0),
  aporte: z.number().min(0, 'El aporte no puede ser negativo').default(0),
  descuento: z.number().min(0, 'El descuento no puede ser negativo').default(0),
  housing_discount: z.boolean().default(false),
  rol_id: z.string().min(1, 'El rol es requerido'),
  correo: z.string().optional(), // Completamente opcional, sin validación de email
  password: z.string().optional(),
  foto: z.string().optional()
});
export type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormProps {
  user?: User;
  onSubmit: (values: UserFormValues, file?: File) => void;
  onCancel: () => void;
  isEditMode?: boolean;
}

export function UserForm({ user, onSubmit, onCancel, isEditMode }: UserFormProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Función para mapear valores de BD a valores del select
  const mapEstadoCivilToSelect = (estadoCivil: string | undefined): string => {
    if (!estadoCivil) return '';

    const estado = estadoCivil.toLowerCase();
    if (estado.includes('soltero') || estado.includes('soltera')) return 'Soltero';
    if (estado.includes('casado') || estado.includes('casada')) return 'Casado';
    if (estado.includes('divorciado') || estado.includes('divorciada')) return 'Divorciado';
    if (estado.includes('viudo') || estado.includes('viuda')) return 'Viudo';
    if (estado.includes('separado') || estado.includes('separada')) return 'Separado';

    return estadoCivil; // Si no coincide, devolver el valor original
  };

  // Función para mapear valores del select a valores de BD
  const mapSelectToEstadoCivil = (selectValue: string): string => {
    switch (selectValue) {
      case 'Soltero':
        return 'Soltero/a';
      case 'Casado':
        return 'Casado/a';
      case 'Divorciado':
        return 'Divorciado/a';
      case 'Viudo':
        return 'Viudo/a';
      case 'Separado':
        return 'Separado/a';
      default:
        return selectValue;
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl && !previewUrl.startsWith('http')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (user?.foto) {
      // Si es una URL completa, usarla directamente; si no, construir la ruta
      const imageUrl = user.foto.startsWith('http') ? user.foto : `/img/users/${user.foto}`;
      setPreviewUrl(imageUrl);
    }
  }, [user]);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
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
      rol_id: user?.roleId?.toString() || '',
      correo: '', // No inicializar con email en modo edición
      password: '',
      foto: user?.foto || '',
      housing_discount: (user?.discount && user.discount > 0) || false
    }
  });

  const housingDiscount = form.watch('housing_discount');
  const descuentoValue = form.watch('descuento');
  const hasDescuento = descuentoValue !== undefined && descuentoValue > 0;

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await fetch('/api/roles');
        if (response.ok) {
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) {
            setRoles(result.data);
          } else {
            console.error('Error: La respuesta de roles no tiene el formato esperado', result);
            setRoles([]);
          }
        }
      } catch (error) {
        console.error('Error al cargar roles:', error);
        setRoles([]);
      } finally {
        setIsLoadingRoles(false);
      }
    };

    fetchRoles();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validaciones del archivo
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        alert('Solo se permiten archivos de imagen (JPG, PNG, GIF)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        // 5MB
        alert('La imagen no puede superar los 5MB');
        return;
      }

      setImageFile(file);
      // Limpiar URL anterior si existe
      if (previewUrl && !previewUrl.startsWith('http')) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(URL.createObjectURL(file));
      form.setValue('foto', file.name);
      console.log('Imagen seleccionada:', file.name, 'tipo:', file.type, 'tamaño:', file.size);
    } else {
      console.log('No se seleccionó ninguna imagen');
    }
  };

  const handleFormSubmit = async (values: UserFormValues) => {
    console.log('🔵 Formulario enviado', values);
    try {
      setIsSubmitting(true);

      // Verificar que los campos nombre y apellido estén presentes
      if (!values.nombre || !values.apellido) {
        console.error('Error: Nombre o apellido faltantes', {
          nombre: values.nombre,
          apellido: values.apellido
        });
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
        console.log('Enviando imagen:', imageFile.name, imageFile.type, imageFile.size);

        // Verificar tipo de archivo nuevamente
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(imageFile.type)) {
          console.error('Tipo de archivo no permitido:', imageFile.type);
          form.setError('foto', {
            type: 'manual',
            message: 'Solo se permiten archivos de imagen (JPG, PNG, GIF)'
          });
          return;
        }

        // Verificar tamaño nuevamente
        if (imageFile.size > 5 * 1024 * 1024) {
          console.error('Tamaño de archivo excede el límite:', imageFile.size);
          form.setError('foto', {
            type: 'manual',
            message: 'La imagen no puede superar los 5MB'
          });
          return;
        }
      } else {
        console.log('No hay imagen para enviar');
      }

      // Asegurarse de que los campos numéricos sean números
      const processedValues = { ...values };
      if (typeof processedValues.sueldo === 'string') {
        processedValues.sueldo = parseFloat(processedValues.sueldo) || 0;
      }
      if (typeof processedValues.aporte === 'string') {
        processedValues.aporte = parseFloat(processedValues.aporte) || 0;
      }
      if (typeof processedValues.descuento === 'string') {
        processedValues.descuento = parseFloat(processedValues.descuento) || 0;
      }

      // Mapear el estado civil del select al formato de la BD
      processedValues.estado_civil = mapSelectToEstadoCivil(processedValues.estado_civil);

      // Si estamos editando y el RUN cambió, actualizar la contraseña al nuevo RUN
      if (isEditMode && user && processedValues.run !== user.run) {
        processedValues.password = processedValues.run;
        console.log('🔵 RUN cambiado, contraseña actualizada al nuevo RUN:', processedValues.run);
      }

      console.log('Valores procesados antes de enviar:', processedValues);
      await onSubmit(processedValues, imageFile || undefined);
      console.log('✅ onSubmit completado');
    } catch (error) {
      console.error('Error al enviar el formulario:', error);
      // Mostrar error general
      form.setError('root', {
        type: 'manual',
        message: 'Error al enviar el formulario. Por favor, inténtelo de nuevo.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  console.log('Errores del formulario:', form.formState.errors);
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className='space-y-4 sm:space-y-6'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start'>
          <div className='flex flex-col gap-4 sm:gap-6'>
            {/* RUN */}
            <FormField
              control={form.control}
              name='run'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-sm sm:text-base'>RUN</FormLabel>
                  <div className='relative'>
                    <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600'>
                      <FontAwesomeIcon icon={faIdCard} className='w-3 h-3 sm:w-4 sm:h-4' />
                    </span>
                    <FormControl>
                      <Input className='pl-10 sm:pl-12 text-sm sm:text-base' placeholder='Run del usuario' {...field} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nick */}
            <FormField
              control={form.control}
              name='nick'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-sm sm:text-base'>Nick</FormLabel>
                  <div className='relative'>
                    <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600'>
                      <FontAwesomeIcon icon={faUserSecret} className='w-3 h-3 sm:w-4 sm:h-4' />
                    </span>
                    <FormControl>
                      <Input className='pl-10 sm:pl-12 text-sm sm:text-base' placeholder='Nick del usuario' {...field} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Imagen */}
          <FormField
            control={form.control}
            name='foto'
            render={({ field: { onChange, onBlur, name, ref, value } }) => {
              const handleClickPreview = () => {
                fileInputRef.current?.click();
              };

              return (
                <FormItem className='flex items-center gap-4 justify-center'>
                  <input
                    type='file'
                    accept='image/*'
                    className='hidden'
                    onChange={handleImageChange}
                    ref={fileInputRef}
                    name={name}
                    onBlur={onBlur}
                    value={undefined}
                  />

                  <div className='flex flex-col items-center'>
                    <button
                      type='button'
                      onClick={handleClickPreview}
                      className='w-40 h-36 rounded-md border border-gray-300 overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 hover:border-gray-400 transition-colors'
                      title='Seleccionar imagen'
                    >
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt='Vista previa'
                          className='w-full h-full object-cover'
                        />
                      ) : (
                        <div className='w-full h-full flex flex-col items-center justify-center text-gray-400'>
                          <FontAwesomeIcon icon={faImage} size='2x' />
                          <span className='text-sm mt-1'>Seleccionar imagen</span>
                        </div>
                      )}
                    </button>

                    {previewUrl && (
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='mt-2 text-red-500 hover:text-red-700'
                        onClick={() => {
                          if (previewUrl && !previewUrl.startsWith('http')) {
                            URL.revokeObjectURL(previewUrl);
                          }
                          setPreviewUrl(null);
                          setImageFile(null);
                          form.setValue('foto', '');
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                      >
                        <FontAwesomeIcon icon={faTrash} className='mr-1' />
                        Eliminar
                      </Button>
                    )}
                  </div>

                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </div>

        {/* Segunda fila: todos los demás campos, ocupa 2 columnas */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6'>
          {/* Nombre */}
          <FormField
            control={form.control}
            name='nombre'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-sm sm:text-base'>Nombre</FormLabel>
                <div className='relative'>
                  <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600'>
                    <FontAwesomeIcon icon={faUser} className='w-3 h-3 sm:w-4 sm:h-4' />
                  </span>
                  <FormControl>
                    <Input className='pl-10 sm:pl-12 text-sm sm:text-base' placeholder='Nombre(s)' {...field} />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Apellido */}
          <FormField
            control={form.control}
            name='apellido'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-sm sm:text-base'>Apellido</FormLabel>
                <div className='relative'>
                  <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600'>
                    <FontAwesomeIcon icon={faSignature} className='w-3 h-3 sm:w-4 sm:h-4' />
                  </span>
                  <FormControl>
                    <Input className='pl-10 sm:pl-12 text-sm sm:text-base' placeholder='Apellido(s)' {...field} />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Dirección - ocupa 2 columnas */}
          <FormField
            control={form.control}
            name='direccion'
            render={({ field }) => (
              <FormItem className='lg:col-span-2'>
                <FormLabel className='text-sm sm:text-base'>Dirección</FormLabel>
                <div className='relative'>
                  <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600'>
                    <FontAwesomeIcon icon={faMapLocationDot} className='w-3 h-3 sm:w-4 sm:h-4' />
                  </span>
                  <FormControl>
                    <Input className='pl-10 sm:pl-12 text-sm sm:text-base' placeholder='Dirección completa' {...field} />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Teléfono */}
          <FormField
            control={form.control}
            name='telefono'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-sm sm:text-base'>Teléfono</FormLabel>
                <div className='relative'>
                  <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600'>
                    <FontAwesomeIcon icon={faPhone} className='w-3 h-3 sm:w-4 sm:h-4' />
                  </span>
                  <FormControl>
                    <Input className='pl-10 sm:pl-12 text-sm sm:text-base' placeholder='Telefono' {...field} />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
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
                      <FontAwesomeIcon icon={faRestroom} />
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
                    <FontAwesomeIcon icon={faHotel} />
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
                    <FontAwesomeIcon icon={faUsers} />
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
          <FormField
            control={form.control}
            name='sueldo'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sueldo </FormLabel>
                <div className='relative'>
                  <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600'>
                    <FontAwesomeIcon icon={faMoneyBillTransfer} />
                  </span>
                                     <FormControl>
                     <Input
                       className='pl-12'
                       type='number'
                       min='0'
                       step='0.01'
                       value={field.value ?? ''}
                       onChange={e => field.onChange(Number(e.target.value))}
                       onFocus={() => field.onChange('')}
                       placeholder='Sueldo'
                     />
                   </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Aporte AFP */}
          <FormField
            control={form.control}
            name='aporte'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Aporte AFP</FormLabel>
                <div className='relative'>
                  <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600'>
                    <FontAwesomeIcon icon={faHandHoldingDollar} />
                  </span>
                                     <FormControl>
                     <Input
                       className='pl-12'
                       type='number'
                       min='0'
                       step='0.01'
                       value={field.value ?? ''}
                       onChange={e => field.onChange(Number(e.target.value))}
                       onFocus={() => field.onChange('')}
                       placeholder='Aporte AFP'
                     />
                   </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
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
              <FormField
                control={form.control}
                name='descuento'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto del Descuento</FormLabel>
                    <div className='relative'>
                      <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600'>
                        <FontAwesomeIcon icon={faMoneyBill1Wave} />
                      </span>
                                             <FormControl>
                         <Input
                           className='pl-12'
                           type='number'
                           min='0'
                           step='0.01'
                           value={field.value ?? 0}
                           onChange={e => field.onChange(Number(e.target.value))}
                           onFocus={() => field.onChange('')}
                           placeholder='Monto del descuento'
                         />
                       </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>

        {/* Botones */}
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
      </form>
    </Form>
  );
}
