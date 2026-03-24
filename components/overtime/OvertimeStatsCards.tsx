/* eslint-disable */
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Users, DollarSign, TrendingUp } from 'lucide-react';
import { Overtime } from '@/types/overtime';

interface OvertimeStatsCardsProps {
  overtime: Overtime[];
  formatCurrency: (amount: number) => string;
}

export default function OvertimeStatsCards({ overtime, formatCurrency }: OvertimeStatsCardsProps) {
  // Calcular totales usando los nuevos campos
  const totalMonto = overtime.reduce((acc, o) => acc + o.total, 0);
  const totalHoras = overtime.reduce((acc, o) => acc + o.hora, 0);

  // Contar usuarios únicos
  const usuariosUnicos = new Set(overtime.map(o => o.id_usuario));
  const totalUsuarios = usuariosUnicos.size;

  // Calcular promedio por hora (solo de registros por cobrar)
  const horasExtrasPorCobrar = overtime.filter(o => o.estado === '1');
  const totalMontoPorCobrar = horasExtrasPorCobrar.reduce((acc, o) => acc + o.total, 0);
  const totalHorasPorCobrar = horasExtrasPorCobrar.reduce((acc, o) => acc + o.hora, 0);

  const promedioPorHora = totalHorasPorCobrar > 0 ? totalMontoPorCobrar / totalHorasPorCobrar : 0;

  return (
    <div className='grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-4 sm:mb-6'>
      <Card className='shadow-sm'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6'>
          <CardTitle className='text-xs sm:text-sm font-medium'>Total Horas Extras</CardTitle>
          <Clock className='h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent className='p-4 sm:p-6 pt-0'>
          <div className='text-lg sm:text-xl lg:text-2xl font-bold'>
            {totalHorasPorCobrar.toFixed(1)} hrs
          </div>
          <p className='text-xs text-muted-foreground'>Horas por pagar</p>
        </CardContent>
      </Card>

      <Card className='shadow-sm'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6'>
          <CardTitle className='text-xs sm:text-sm font-medium'>Usuarios</CardTitle>
          <Users className='h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent className='p-4 sm:p-6 pt-0'>
          <div className='text-lg sm:text-xl lg:text-2xl font-bold'>{totalUsuarios}</div>
          <p className='text-xs text-muted-foreground'>Con horas extras</p>
        </CardContent>
      </Card>

      <Card className='shadow-sm'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6'>
          <CardTitle className='text-xs sm:text-sm font-medium'>Total a Pagar</CardTitle>
          <DollarSign className='h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent className='p-4 sm:p-6 pt-0'>
          <div className='text-lg sm:text-xl lg:text-2xl font-bold'>
            {formatCurrency(totalMontoPorCobrar)}
          </div>
          <p className='text-xs text-muted-foreground'>Monto por pagar</p>
        </CardContent>
      </Card>

      <Card className='shadow-sm'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6'>
          <CardTitle className='text-xs sm:text-sm font-medium'>Promedio por Hora</CardTitle>
          <TrendingUp className='h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent className='p-4 sm:p-6 pt-0'>
          <div className='text-lg sm:text-xl lg:text-2xl font-bold'>
            {formatCurrency(promedioPorHora)}
          </div>
          <p className='text-xs text-muted-foreground'>Precio promedio</p>
        </CardContent>
      </Card>
    </div>
  );
}
