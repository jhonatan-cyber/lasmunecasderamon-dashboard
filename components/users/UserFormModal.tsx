'use client';

import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User as UserType } from '@/types/user';
import { FormProvider, useForm } from 'react-hook-form';
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
  DollarSign,
  Coins,
  Info
} from 'lucide-react';
import { FormFieldWithIcon } from './FormFieldWithIcon';
import { ImageUploadField } from './ImageUploadField';
import { NumberInputField } from './NumberInputField';
import { MaritalStatusSelect, AfpInputField, HousingDiscountField } from './fields';
import { RoleSelect } from '@/components/users/RoleSelect';
import { useUserForm, type UserFormValues } from '@/hooks/personal/useUserForm';
export type { UserFormValues };

interface UserFormModalProps {
  user: UserType | null;
  isOpen: boolean;
  isEditing: boolean;
  isMutating: boolean;
  onSubmit: (values: UserFormValues, file?: File) => void;
  onCancel: () => void;
}

export function UserFormModal({ user, isOpen, isEditing, isMutating, onSubmit, onCancel }: UserFormModalProps) {
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
  } = useUserForm({ user: user || undefined, onSubmit, isEditMode: isEditing });

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className='max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden'>
        <DialogHeader className='p-6 pb-2 border-b'>
          <DialogTitle className='text-xl font-bold'>{isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
          <DialogDescription className='sr-only'>Formulario para crear o editar usuarios</DialogDescription>
        </DialogHeader>
        <div className='flex-1 overflow-y-auto p-6'>
          <FormProvider {...form}>
            <form
              id='user-form'
              onSubmit={handleFormSubmit}
              className='space-y-4 sm:space-y-6'
            >
              <Alert className='bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/10 dark:border-blue-900/30 dark:text-blue-300 rounded-2xl'>
                <Info className='h-5 w-5 text-blue-600 dark:text-blue-400' />
                <AlertTitle className='text-sm font-bold'>Credenciales de Acceso</AlertTitle>
                <AlertDescription className='text-xs opacity-90'>
                  Por seguridad y simplicidad, la <strong>contraseña</strong> del usuario será exactamente igual a su <strong>RUN</strong>.
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
                <MaritalStatusSelect
                  control={form.control}
                  name='maritalStatus'
                />

                {/* AFP */}
                <AfpInputField
                  control={form.control}
                  name='afp'
                />

                {/* Rol */}
                <RoleSelect
                  control={form.control}
                  name='rol_id'
                  roles={roles}
                  isLoading={isLoadingRoles}
                  label='Rol'
                  placeholder='Seleccione un rol'
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
                <HousingDiscountField
                  control={form.control}
                  watch={form.watch}
                  discountName='discount'
                  formattedValue={descuento.formattedValue}
                  onValueChange={descuento.handleChange}
                />
              </div>
            </form>
          </FormProvider>
        </div>
        <div className='border-t p-4 bg-gray-50 dark:bg-slate-900/50 flex justify-center gap-3 px-6 rounded-b-2xl'>
          <Button
            onClick={onCancel}
            variant='outline'
            className='rounded-full px-6 dark:hover:!bg-white dark:hover:!text-black transition-all hover:scale-105'
            disabled={isMutating || isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type='submit'
            form='user-form'
            className='bg-black text-white dark:bg-black dark:text-white  dark:hover:!bg-white dark:hover:!text-black rounded-full px-8 hover:!bg-white hover:!text-black transition-all hover:scale-105 border-2'
            disabled={isMutating || isSubmitting}
          >
            {isMutating || isSubmitting ? (
              <div className='flex items-center gap-2'>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span>{isEditing ? 'Actualizando...' : 'Guardando...'}</span>
              </div>
            ) : (
              <span>{isEditing ? 'Actualizar' : 'Guardar'}</span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
