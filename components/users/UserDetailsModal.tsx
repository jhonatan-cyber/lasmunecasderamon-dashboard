'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from '@/types/user';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AtSign,
  Phone,
  MapPin,
  TrendingUp,
  DollarSign,
  Coins,
  CreditCard,
  Building,
  Heart,
  Fingerprint,
  ScanFace,
  FileImage
} from 'lucide-react';

interface UserDetailsModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

interface PlantillaBiometrica {
  tipo: string;
  sincronizada?: number;
  fecha_captura?: string | null;
}

interface BiometricStatus {
  codigo: string | null;
  huella: number;
  facial: number;
  ultima_verificacion: string | null;
  ultimo_resultado: string | null;
  cara_base64: string | null;
  huella_hex: string | null;
  plantillas?: PlantillaBiometrica[];
}

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'Sin fecha';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Sin fecha';
  return format(date, 'PPP', { locale: es });
};

const getRoleBadgeColor = (role: string) => {
  const roleColors: { [key: string]: string } = {
    admin: 'bg-purple-100 text-purple-900 hover:bg-purple-200',
    administrador: 'bg-purple-100 text-purple-900 hover:bg-purple-200',
    garzon: 'bg-blue-100 text-blue-900 hover:bg-blue-200',
    anfitriona: 'bg-red-100 text-red-900 hover:bg-red-200',
    cajero: 'bg-green-100 text-green-900 hover:bg-green-200',
    default: 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100'
  };

  const normalizedRole = role?.toLowerCase().trim() || 'default';
  return roleColors[normalizedRole] || roleColors['default'];
};

export function UserDetailsModal({ user, isOpen, onClose }: UserDetailsModalProps) {
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus | null>(null);

  useEffect(() => {
    if (!isOpen || !user?.id) {
      setBiometricStatus(null);
      return;
    }
    const fetchBiometric = async () => {
      try {
        const res = await fetch(`/api/users/${user.id}/biometric`);
        if (res.ok) {
          const json = await res.json();
          setBiometricStatus(json.data || null);
        }
      } catch (error) {
        console.error('Error fetching biometric status:', error);
      }
    };
    fetchBiometric();
  }, [isOpen, user?.id]);

  if (!user) return null;

  const facialEnrolado = Number(biometricStatus?.facial ?? user.biometrico_facial) === 1;
  const huellaEnrolada = Number(biometricStatus?.huella ?? user.biometrico_huella) === 1;
  const plantillas = biometricStatus?.plantillas || [];
  const plantillasCara = plantillas.filter(p => p.tipo === 'cara').length;
  const plantillasHuella = plantillas.filter(p => p.tipo === 'huella').length;
  const totalPlantillas = plantillasCara + plantillasHuella;

  const formatCurrency = (
    value: number | string | undefined,
    type: 'sueldo' | 'aporte' | 'descuento' = 'sueldo'
  ): string => {
    if (value === undefined || value === null) {
      return type === 'sueldo' ? 'Sin sueldo' : type === 'aporte' ? 'Sin aporte' : 'Sin descuento';
    }
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue) || numValue === 0) {
      return type === 'sueldo' ? 'Sin sueldo' : type === 'aporte' ? 'Sin aporte' : 'Sin descuento';
    }
    return `$${new Intl.NumberFormat('es-CL', {
      style: 'decimal',
      maximumFractionDigits: 0
    }).format(numValue)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden'>
        <DialogHeader className='p-4 pr-12 border-b flex flex-row items-center justify-between sm:p-6 sm:pr-14'>
          <div>
            <DialogTitle className='text-xl font-bold'>Detalles del Usuario</DialogTitle>
            <DialogDescription className='sr-only'>
              Información detallada del usuario seleccionado
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className='min-h-0 flex-1 overflow-y-auto p-4 sm:p-6'>
          <div className='w-full max-w-xl mx-auto'>
            <div className='flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 sm:gap-6 mb-4 sm:mb-6'>
              <div className='flex items-center space-x-3 sm:space-x-4'>
                <Avatar className='h-12 w-12 sm:h-16 sm:w-16'>
                  <AvatarImage
                    src={user.foto ? `/img/users/${user.foto}` : '/img/users/default.png'}
                    alt={user.name || user.nick || 'Usuario'}
                  />
                  <AvatarFallback className='bg-gray-200 text-sm sm:text-lg'>
                    {user.name ? user.name[0].toUpperCase() : ''}
                    {user.lastName ? user.lastName[0].toUpperCase() : ''}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className='text-lg sm:text-xl lg:text-2xl font-bold'>
                    {user.name} {user.lastName}
                  </h2>
                  <div className='flex items-center mt-1 space-x-2'>
                    <Badge
                      className={`text-xs sm:text-sm ${
                        user.status === 1
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {user.status === 1 ? 'Activo' : 'Inactivo'}
                    </Badge>
                    <Badge className={`${getRoleBadgeColor(user.role)} text-xs sm:text-sm`}>
                      {user.role || 'Sin rol'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className='space-y-4 sm:space-y-6'>
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6'>
                <div className='space-y-3 sm:space-y-4'>
                  <h3 className='font-semibold text-gray-700 dark:text-gray-200 text-sm sm:text-base'>
                    Información Personal
                  </h3>
                  <div className='space-y-2 sm:space-y-3'>
                    <div className='flex items-start'>
                      <CreditCard className='h-3 w-3 sm:h-4 sm:w-4 mt-1 mr-2 text-gray-400 shrink-0' />
                      <div>
                        <p className='text-xs sm:text-sm font-medium'>ID</p>
                        <p className='text-xs sm:text-sm text-gray-600 font-mono'>
                          {user.id || 'No especificado'}
                        </p>
                      </div>
                    </div>
                    <div className='flex items-start'>
                      <CreditCard className='h-3 w-3 sm:h-4 sm:w-4 mt-1 mr-2 text-gray-400 shrink-0' />
                      <div>
                        <p className='text-xs sm:text-sm font-medium'>RUT</p>
                        <p className='text-xs sm:text-sm text-gray-600'>
                          {user.run || 'No especificado'}
                        </p>
                      </div>
                    </div>
                    <div className='flex items-start'>
                      <AtSign className='h-3 w-3 sm:h-4 sm:w-4 mt-1 mr-2 text-gray-400 shrink-0' />
                      <div>
                        <p className='text-xs sm:text-sm font-medium'>Email</p>
                        <p className='text-xs sm:text-sm text-gray-600'>
                          {user.email || 'No especificado'}
                        </p>
                      </div>
                    </div>
                    <div className='flex items-start'>
                      <Phone className='h-3 w-3 sm:h-4 sm:w-4 mt-1 mr-2 text-gray-400 shrink-0' />
                      <div>
                        <p className='text-xs sm:text-sm font-medium'>Teléfono</p>
                        <p className='text-xs sm:text-sm text-gray-600'>
                          {user.phone || 'No especificado'}
                        </p>
                      </div>
                    </div>
                    <div className='flex items-start'>
                      <MapPin className='h-3 w-3 sm:h-4 sm:w-4 mt-1 mr-2 text-gray-400 shrink-0' />
                      <div>
                        <p className='text-xs sm:text-sm font-medium'>Dirección</p>
                        <p className='text-xs sm:text-sm text-gray-600'>
                          {user.address || 'No especificada'}
                        </p>
                      </div>
                    </div>
                    <div className='flex items-start'>
                      <Heart className='h-3 w-3 sm:h-4 sm:w-4 mt-1 mr-2 text-gray-400 shrink-0' />
                      <div>
                        <p className='text-xs sm:text-sm font-medium'>Estado Civil</p>
                        <Badge
                          className={`mt-1 text-xs sm:text-sm ${
                            ['Soltero', 'Soltera'].includes(user.maritalStatus || '')
                              ? 'bg-green-100 text-green-700'
                              : ['Casado', 'Casada'].includes(user.maritalStatus || '')
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-100'
                          }`}
                        >
                          {user.maritalStatus || 'Sin estado civil'}
                        </Badge>
                      </div>
                    </div>
                    <div className='flex items-start'>
                      <Building className='h-3 w-3 sm:h-4 sm:w-4 mt-1 mr-2 text-gray-400 shrink-0' />
                      <div>
                        <p className='text-xs sm:text-sm font-medium'>AFP</p>
                        <p className='text-xs sm:text-sm text-gray-600'>
                          {user.afp || 'No especificada'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className='space-y-3 sm:space-y-4'>
                  <h3 className='font-semibold text-gray-700 dark:text-gray-200 text-sm sm:text-base'>
                    Información Financiera
                  </h3>
                  <div className='space-y-2 sm:space-y-3'>
                    <div className='flex items-start'>
                      <TrendingUp className='h-3 w-3 sm:h-4 sm:w-4 mt-1 mr-2 text-gray-400 shrink-0' />
                      <div>
                        <p className='text-xs sm:text-sm font-medium'>Sueldo</p>
                        <p className='text-sm text-gray-600'>
                          {formatCurrency(user.salary, 'sueldo')}
                        </p>
                      </div>
                    </div>
                    <div className='flex items-start'>
                      <DollarSign className='h-4 w-4 mt-1 mr-2 text-gray-400 shrink-0' />
                      <div>
                        <p className='text-sm font-medium'>Aporte AFP</p>
                        <p className='text-sm text-gray-600'>
                          {formatCurrency(user.contributions, 'aporte')}
                        </p>
                      </div>
                    </div>
                    <div className='flex items-start'>
                      <Coins className='h-4 w-4 mt-1 mr-2 text-gray-400 shrink-0' />
                      <div>
                        <p className='text-sm font-medium'>Descuento de habitación</p>
                        <p className='text-sm text-gray-600'>
                          {formatCurrency(user.discount, 'descuento')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className='space-y-4'>
                <h3 className='font-semibold text-gray-700 dark:text-gray-200 text-md flex items-center gap-2'>
                  <Fingerprint className='h-4 w-4' />
                  Biometría
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <p className='text-sm font-medium text-gray-500'>Reconocimiento facial</p>
                    <div className='flex items-center gap-2 mt-1'>
                      <ScanFace className='h-4 w-4 text-gray-400' />
                      <Badge
                        className={`text-xs ${
                          facialEnrolado
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-100'
                        }`}
                      >
                        {facialEnrolado ? 'Enrolado' : 'No enrolado'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className='text-sm font-medium text-gray-500'>Huella dactilar</p>
                    <div className='flex items-center gap-2 mt-1'>
                      <Fingerprint className='h-4 w-4 text-gray-400' />
                      <Badge
                        className={`text-xs ${
                          huellaEnrolada
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-100'
                        }`}
                      >
                        {huellaEnrolada ? 'Enrolado' : 'No enrolado'}
                      </Badge>
                    </div>
                  </div>
                  {totalPlantillas > 0 ? (
                    <div className='md:col-span-2'>
                      <p className='text-sm font-medium text-gray-500 flex items-center gap-1'>
                        <FileImage className='h-3 w-3' />
                        Plantillas guardadas
                      </p>
                      <div className='flex items-center gap-3 mt-1 text-xs text-gray-600'>
                        <span>Faciales: {plantillasCara}</span>
                        <span>Huellas: {plantillasHuella}</span>
                        <span className='font-medium'>Total: {totalPlantillas}</span>
                      </div>
                    </div>
                  ) : null}
                </div>
                {facialEnrolado ? (
                  <p className='text-xs text-gray-500'>
                    La plantilla facial se guarda en el sistema/lector según el flujo. El vector no
                    se muestra aquí por seguridad/tamaño.
                  </p>
                ) : null}
              </div>

              <div className='space-y-4'>
                <h3 className='font-semibold text-gray-700 dark:text-gray-200 text-md'>Registro</h3>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  <div>
                    <p className='text-sm font-medium text-gray-500'>Fecha de Creación</p>
                    <p className='text-sm text-gray-600'>{formatDate(user.created_at)}</p>
                  </div>
                  <div>
                    <p className='text-sm font-medium text-gray-500'>Última Actualización</p>
                    <p className='text-sm text-gray-600'>{formatDate(user.updated_at)}</p>
                  </div>
                  <div>
                    <p className='text-sm font-medium text-gray-500'>Fecha de Eliminación</p>
                    <p className='text-sm text-gray-600'>{formatDate(user.deleted_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className='border-t bg-gray-50 p-4 dark:bg-slate-900/50 flex justify-center rounded-b-2xl sm:p-6'>
          <Button
            onClick={onClose}
            className='bg-black text-white dark:bg-black dark:text-white dark:hover:bg-white! dark:hover:text-black! rounded-full px-8 transition-all hover:bg-white! hover:text-black! hover:scale-105 border-2'
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
