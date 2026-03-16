'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, Gift, TrendingUp } from 'lucide-react';
import { Gratificacion } from '@/types/gratificacion';

interface GratificacionesStatsCardsProps {
  gratificaciones: Gratificacion[];
  formatCurrency: (amount: number) => string;
}

export default function GratificacionesStatsCards({ gratificaciones, formatCurrency }: GratificacionesStatsCardsProps) {
  const totalMonto = gratificaciones.reduce((acc, g) => acc + g.monto, 0);
  const usuariosUnicos = new Set(gratificaciones.map(g => g.usuario_id));
  const totalUsuarios = usuariosUnicos.size;
  const totalRegistros = gratificaciones.length;

  const promedioPorUsuario = totalUsuarios > 0 ? totalMonto / totalUsuarios : 0;

  return (
    <div className='grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-4 sm:mb-6'>
      <Card className='shadow-sm'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6'>
          <CardTitle className='text-xs sm:text-sm font-medium'>Total Gratificaciones</CardTitle>
          <Gift className='h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent className='p-4 sm:p-6 pt-0'>
          <div className='text-lg sm:text-xl lg:text-2xl font-bold'>
            {totalRegistros}
          </div>
          <p className='text-xs text-muted-foreground'>Registros</p>
        </CardContent>
      </Card>

      <Card className='shadow-sm'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6'>
          <CardTitle className='text-xs sm:text-sm font-medium'>Usuarios</CardTitle>
          <Users className='h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent className='p-4 sm:p-6 pt-0'>
          <div className='text-lg sm:text-xl lg:text-2xl font-bold'>{totalUsuarios}</div>
          <p className='text-xs text-muted-foreground'>Con gratificaciones</p>
        </CardContent>
      </Card>

      <Card className='shadow-sm'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6'>
          <CardTitle className='text-xs sm:text-sm font-medium'>Monto Total</CardTitle>
          <DollarSign className='h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent className='p-4 sm:p-6 pt-0'>
          <div className='text-lg sm:text-xl lg:text-2xl font-bold'>
            {formatCurrency(totalMonto)}
          </div>
          <p className='text-xs text-muted-foreground'>Total pagado</p>
        </CardContent>
      </Card>

      <Card className='shadow-sm'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6'>
          <CardTitle className='text-xs sm:text-sm font-medium'>Promedio por Usuario</CardTitle>
          <TrendingUp className='h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent className='p-4 sm:p-6 pt-0'>
          <div className='text-lg sm:text-xl lg:text-2xl font-bold'>
            {formatCurrency(promedioPorUsuario)}
          </div>
          <p className='text-xs text-muted-foreground'>Monto promedio</p>
        </CardContent>
      </Card>
    </div>
  );
}
