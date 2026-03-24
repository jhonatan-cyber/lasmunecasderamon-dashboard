/* eslint-disable */
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Clock, DollarSign, Users } from 'lucide-react';
import { ServicioWithDetails } from '@/types/servicio';
import { calculateServiceStats, calculateRoomStats } from '@/lib/serviceUtils';
import { formatCurrencyCLP } from '@/lib/formatters';

interface ServiceStatsProps {
  servicios: ServicioWithDetails[];
}

export default function ServiceStats({ servicios }: ServiceStatsProps) {
  // Calcular estadísticas usando utilidades
  const serviceStats = calculateServiceStats(servicios);

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
      {/* Total Servicios */}
      <Card className='shadow-sm'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6'>
          <CardTitle className='text-xs sm:text-sm font-medium'>Total Servicios</CardTitle>
          <Lock className='h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent className='p-4 sm:p-6 pt-0'>
          <div className='text-lg sm:text-xl lg:text-2xl font-bold'>
            {serviceStats.totalServicios}
          </div>
          <p className='text-xs text-muted-foreground'>Servicios registrados</p>
        </CardContent>
      </Card>

      {/* Servicios Activos */}
      <Card className='shadow-sm'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6'>
          <CardTitle className='text-xs sm:text-sm font-medium'>En Proceso</CardTitle>
          <Clock className='h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent className='p-4 sm:p-6 pt-0'>
          <div className='text-lg sm:text-xl lg:text-2xl font-bold'>
            {serviceStats.serviciosActivos}
          </div>
          <p className='text-xs text-muted-foreground'>Atendiendo ahora</p>
        </CardContent>
      </Card>

      {/* Ingresos Totales */}
      <Card className='shadow-sm'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6'>
          <CardTitle className='text-xs sm:text-sm font-medium'>Ingresos</CardTitle>
          <DollarSign className='h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent className='p-4 sm:p-6 pt-0'>
          <div className='text-lg sm:text-xl lg:text-2xl font-bold'>
            {formatCurrencyCLP(serviceStats.ingresosTotales)}
          </div>
          <p className='text-xs text-muted-foreground'>Servicios completados</p>
        </CardContent>
      </Card>

      {/* Promedio Tiempo */}
      <Card className='shadow-sm'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6'>
          <CardTitle className='text-xs sm:text-sm font-medium'>Promedio tiempo</CardTitle>
          <Users className='h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent className='p-4 sm:p-6 pt-0'>
          <div className='text-lg sm:text-xl lg:text-2xl font-bold'>
            {serviceStats.promedioTiempo}m
          </div>
          <p className='text-xs text-muted-foreground'>Por sesión activa</p>
        </CardContent>
      </Card>
    </div>
  );
}
