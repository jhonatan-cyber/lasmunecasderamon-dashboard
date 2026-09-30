'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User as UserType } from '@/types/user';
import { FormProvider, useForm } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CreditCard,
  UserCircle,
  User,
  FileSignature,
  Phone,
  MapPin,
  DollarSign,
  Coins,
  Info,
  ScanFace
} from 'lucide-react';
import { FormFieldWithIcon } from './FormFieldWithIcon';
import { ImageUploadField } from './ImageUploadField';
import { NumberInputField } from './NumberInputField';
import { MaritalStatusSelect, AfpInputField, HousingDiscountField } from './fields';
import { RoleSelect } from '@/components/users/RoleSelect';
import { useUserForm, type UserFormValues } from '@/hooks/personal';
export type { UserFormValues };

const formatRUT = (value: string): string => {
  const clean = value.replace(/[^0-9kK]/gi, '').toUpperCase();
  if (!clean) return '';

  if (clean.length <= 1) return clean;

  const cuerpo = clean.slice(0, -1);
  const dv = clean.slice(-1);

  const formattedCuerpo = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${formattedCuerpo}-${dv}`;
};

const isValidRUT = (rut: string): boolean => {
  const clean = rut.replace(/[^0-9kK]/gi, '');
  if (clean.length < 2) return false;

  const cuerpo = clean.slice(0, -1);
  const dv = clean.slice(-1).toUpperCase();

  let sum = 0;
  let mul = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    sum += parseInt(cuerpo[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }

  let result = 11 - (sum % 11);
  let expectedDv = '';

  if (result === 11) expectedDv = '0';
  else if (result === 10) expectedDv = 'K';
  else expectedDv = result.toString();

  return dv === expectedDv;
};

interface UserFormModalProps {
  user: UserType | null;
  isOpen: boolean;
  isEditing: boolean;
  isMutating: boolean;
  onSubmit: (values: UserFormValues, file?: File) => void;
  onCancel: () => void;
}

/** Equipos que pueden recibir el alta: se muestran solo los operativos. */
interface DispositivoItem {
  id: string;
  nombre: string;
  ip: string | null;
  usuario_equipo: string | null;
  revocado_en: string | null;
}

export function UserFormModal({
  user,
  isOpen,
  isEditing,
  isMutating,
  onSubmit,
  onCancel
}: UserFormModalProps) {
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

  const [runFormatted, setRunFormatted] = useState(user?.run || '');
  const [runError, setRunError] = useState('');

  // ── Alta en el lector al crear ──────────────────────────────────────────
  // Los equipos operativos (con IP y credenciales) se ofrecen en el formulario:
  // al guardar, además de crear el usuario, el servidor lo da de alta en el
  // equipo elegido. Si no hay ninguno, la opción no se muestra y no se pide alta.
  const [dispositivos, setDispositivos] = useState<DispositivoItem[]>([]);
  const altaEquipo = form.watch('alta_equipo');
  const dispositivoAlta = form.watch('dispositivo_alta');

  useEffect(() => {
    if (!isOpen || isEditing) return;
    let cancelado = false;
    (async () => {
      try {
        const res = await fetch('/api/biometric/devices', { cache: 'no-store' });
        const result = await res.json();
        if (cancelado) return;
        const activos: DispositivoItem[] = (res.ok && result.success ? result.data : []).filter(
          (d: DispositivoItem) => !d.revocado_en && d.ip && d.usuario_equipo
        );
        setDispositivos(activos);
        if (!activos.some(d => d.id === form.getValues('dispositivo_alta'))) {
          form.setValue('dispositivo_alta', activos[0]?.id ?? '');
        }
        if (activos.length === 0) form.setValue('alta_equipo', false);
      } catch {
        if (!cancelado) {
          setDispositivos([]);
          form.setValue('alta_equipo', false);
        }
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [isOpen, isEditing, form]);

  useEffect(() => {
    if (user?.run) {
      const formatted = formatRUT(user.run);
      setRunFormatted(formatted);
    } else {
      setRunFormatted('');
    }
  }, [user?.run]);

  const handleRunChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatRUT(value);
    setRunFormatted(formatted);
    form.setValue('run', formatted);

    const clean = value.replace(/[^0-9kK]/gi, '');
    if (clean && clean.length >= 2) {
      if (!isValidRUT(clean)) {
        setRunError('RUT inválido');
      } else {
        setRunError('');
      }
    } else {
      setRunError('');
    }
  };

  const handleRunBlur = () => {
    const clean = runFormatted.replace(/[^0-9kK]/gi, '');
    if (clean && clean.length >= 2) {
      if (!isValidRUT(clean)) {
        setRunError('RUT inválido');
      } else {
        setRunError('');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className='max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden'>
        <DialogHeader className='p-6 pb-2 border-b'>
          <DialogTitle className='text-xl font-bold'>
            {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
          </DialogTitle>
          <DialogDescription className='sr-only'>
            Formulario para crear o editar usuarios
          </DialogDescription>
        </DialogHeader>
        <div className='flex-1 overflow-y-auto p-6'>
          <FormProvider {...form}>
            <form id='user-form' onSubmit={handleFormSubmit} className='space-y-4 sm:space-y-6'>
              <Alert className='bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/10 dark:border-blue-900/30 dark:text-blue-300 rounded-2xl'>
                <Info className='h-5 w-5 text-blue-600 dark:text-blue-400' />
                <AlertTitle className='text-sm font-bold'>Credenciales de Acceso</AlertTitle>
                <AlertDescription className='text-xs opacity-90'>
                  Por seguridad y simplicidad, la <strong>contraseña</strong> del usuario será
                  exactamente igual a su <strong>RUT</strong>.
                </AlertDescription>
              </Alert>

              <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start'>
                <div className='flex flex-col gap-4 sm:gap-6'>
                  {}
                  <div>
                    <label
                      htmlFor='user-rut'
                      className='block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-200 mb-1'
                    >
                      RUT
                    </label>
                    <div className='relative'>
                      <CreditCard className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 w-3 h-3 sm:w-4 sm:h-4 pointer-events-none' />
                      <input
                        id='user-rut'
                        type='text'
                        value={runFormatted}
                        onChange={handleRunChange}
                        onBlur={handleRunBlur}
                        placeholder='12.345.678-5'
                        className='flex h-10 w-full rounded-full border border-input bg-gray-100 pl-10 sm:pl-12 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:focus-visible:ring-gray-400'
                      />
                    </div>
                    {runError && (
                      <p role='alert' className='text-red-500 text-xs mt-1'>
                        {runError}
                      </p>
                    )}
                  </div>

                  {}
                  <FormFieldWithIcon
                    control={form.control as any}
                    name='nick'
                    label='Nick'
                    placeholder='Nick del usuario'
                    icon={UserCircle}
                    capitalize
                  />
                </div>

                {}
                <ImageUploadField
                  control={form.control as any}
                  initialImageUrl={user?.foto}
                  onImageChange={setImageFile}
                />
              </div>

              {}
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6'>
                {}
                <FormFieldWithIcon
                  control={form.control as any}
                  name='name'
                  label='Nombre'
                  placeholder='Nombre(s)'
                  icon={User}
                  capitalize
                />

                {}
                <FormFieldWithIcon
                  control={form.control as any}
                  name='lastName'
                  label='Apellido'
                  placeholder='Apellido(s)'
                  icon={FileSignature}
                  capitalize
                />

                {}
                <div className='lg:col-span-2'>
                  <FormFieldWithIcon
                    control={form.control as any}
                    name='address'
                    label='Dirección'
                    placeholder='Dirección completa'
                    icon={MapPin}
                    capitalize
                  />
                </div>

                {}
                <FormFieldWithIcon
                  control={form.control as any}
                  name='phone'
                  label='Teléfono'
                  placeholder='Telefono'
                  icon={Phone}
                />

                {}
                <MaritalStatusSelect control={form.control as any} name='maritalStatus' />

                {}
                <AfpInputField control={form.control as any} name='afp' />

                {}
                <RoleSelect
                  control={form.control as any}
                  name='rol_id'
                  roles={roles}
                  isLoading={isLoadingRoles}
                  label='Rol'
                  placeholder='Seleccione un rol'
                />

                {}
                <NumberInputField
                  control={form.control as any}
                  name='salary'
                  label='Monto en Sueldo'
                  icon={DollarSign}
                  formattedValue={sueldo.formattedValue}
                  onValueChange={sueldo.handleChange}
                />

                {}
                <NumberInputField
                  control={form.control as any}
                  name='contributions'
                  label='Monto en Aporte AFP'
                  icon={Coins}
                  formattedValue={aporte.formattedValue}
                  onValueChange={aporte.handleChange}
                />

                {}
                <HousingDiscountField
                  control={form.control as any}
                  watch={form.watch}
                  discountName='discount'
                  formattedValue={descuento.formattedValue}
                  onValueChange={descuento.handleChange}
                />
              </div>

              {!isEditing && dispositivos.length > 0 && (
                <div className='rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-900/10 p-4 space-y-3'>
                  <label className='flex items-center gap-2 text-sm font-medium text-emerald-900 dark:text-emerald-200 cursor-pointer'>
                    <input
                      type='checkbox'
                      className='h-4 w-4 rounded border-input'
                      checked={altaEquipo}
                      onChange={e =>
                        form.setValue('alta_equipo', e.target.checked, { shouldValidate: true })
                      }
                    />
                    <ScanFace className='w-4 h-4' />
                    Dar de alta en el lector de asistencia al crear
                  </label>
                  {altaEquipo && (
                    <>
                      <div className='space-y-1'>
                        <label
                          htmlFor='alta-dispositivo'
                          className='block text-xs font-medium text-emerald-900 dark:text-emerald-200'
                        >
                          Equipo
                        </label>
                        <select
                          id='alta-dispositivo'
                          value={dispositivoAlta}
                          onChange={e => form.setValue('dispositivo_alta', e.target.value)}
                          className='flex h-9 w-full rounded-lg border border-input bg-gray-100 px-3 text-sm dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700'
                        >
                          {dispositivos.map(d => (
                            <option key={d.id} value={d.id}>
                              {d.nombre} · {d.ip}
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        Al guardar se genera su código biométrico, su foto queda como plantilla
                        maestra y se crea la persona con su cara en el lector por red (NetSDK), sin
                        usar el menú del equipo. Si el equipo no responde, el usuario se crea igual
                        y podés reintentar desde «Enrolar» en su ficha.
                      </p>
                    </>
                  )}
                </div>
              )}
            </form>
          </FormProvider>
        </div>
        <div className='border-t p-4 bg-gray-50 dark:bg-slate-900/50 flex justify-center gap-3 px-6 rounded-b-2xl'>
          <Button
            onClick={onCancel}
            variant='outline'
            className='rounded-full px-6 dark:hover:bg-white! dark:hover:text-black! transition-all hover:scale-105'
            disabled={isMutating || isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type='submit'
            form='user-form'
            className='bg-black text-white dark:bg-black dark:text-white  dark:hover:bg-white! dark:hover:text-black! rounded-full px-8 hover:bg-white! hover:text-black! transition-all hover:scale-105 border-2'
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
