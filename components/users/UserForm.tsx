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
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
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
  Users,
  Info
} from 'lucide-react';
import { FormFieldWithIcon } from './FormFieldWithIcon';
import { ImageUploadField } from './ImageUploadField';
import { NumberInputField } from './NumberInputField';
import { useUserForm, type UserFormValues } from '@/hooks/personal/useUserForm';
export type { UserFormValues };

interface UserFormProps {
  user?: UserType;
  onSubmit: (values: UserFormValues, file?: File) => void;
  onCancel: () => void;
  isEditMode?: boolean;
  hideButtons?: boolean;
}

export function UserForm({
  user,
  onSubmit,
  onCancel,
  isEditMode,
  hideButtons = false
}: UserFormProps) {
  const {
    form,
    roles,
    isLoadingRoles,
    isSubmitting,
    setImageFile,
    sueldo,
    aporte,
    descuento,
    handleFormSubmit
  } = useUserForm({ user, onSubmit, isEditMode });

  return (
    <Form {...form}>
      <form
        id='user-form'
        onSubmit={handleFormSubmit}
        className='space-y-4 sm:space-y-6'
      >
        <Alert className='bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/10 dark:border-blue-900/30 dark:text-blue-300 rounded-2xl'>
          <Info className='h-5 w-5 text-blue-600 dark:text-blue-400' />
          <AlertTitle className='text-sm font-bold'>Credenciales de Acceso</AlertTitle>
          <AlertDescription className='text-xs opacity-90'>
            Por seguridad y simplicidad, la **contraseña** del usuario será exactamente igual a su **RUN**.
          </AlertDescription>
        </Alert>

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
              capitalize
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
            name='name'
            label='Nombre'
            placeholder='Nombre(s)'
            icon={User}
            capitalize
          />

          {/* Apellido */}
          <FormFieldWithIcon
            control={form.control}
            name='lastName'
            label='Apellido'
            placeholder='Apellido(s)'
            icon={FileSignature}
            capitalize
          />

          {/* Dirección - ocupa 2 columnas */}
          <div className='lg:col-span-2'>
            <FormFieldWithIcon
              control={form.control}
              name='address'
              label='Dirección'
              placeholder='Dirección completa'
              icon={MapPin}
              capitalize
            />
          </div>

          {/* Teléfono */}
          <FormFieldWithIcon
            control={form.control}
            name='phone'
            label='Teléfono'
            placeholder='Telefono'
            icon={Phone}
          />

          {/* Estado Civil */}
          <FormField
            control={form.control}
            name='maritalStatus'
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
                    <Input
                      className='pl-12'
                      placeholder='Establecimiento AFP'
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        field.onChange(value);
                      }}
                    />
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
                      {!isLoadingRoles && roles && roles.length > 0 ? (
                        roles
                          .filter(role => role.status === 1)
                          .map((role: any) => (
                            <SelectItem key={role.id} value={role.id.toString()}>
                              {role.name}
                            </SelectItem>
                          ))
                      ) : (
                        <SelectItem value="no-roles" disabled>
                          {isLoadingRoles ? 'Cargando...' : 'No hay roles disponibles'}
                        </SelectItem>
                      )}
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
            name='salary'
            label='Monto en Sueldo'
            icon={DollarSign}
            formattedValue={sueldo.formattedValue}
            onValueChange={sueldo.handleChange}
          />

          {/* Aporte AFP */}
          <NumberInputField
            control={form.control}
            name='contributions'
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
                name='discount'
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
              className='flex items-center gap-2 rounded-full hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-sm sm:text-base w-full sm:w-auto'
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
              className='flex items-center bg-black text-white dark:bg-white dark:text-black gap-2 rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto dark:hover:bg-gray-200'
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
