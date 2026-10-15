'use client';
import { MetricCard } from '@/components/shared/MetricCard';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingUp, Clock, Users } from 'lucide-react';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

interface CommissionsStatsCardsProps {
  totalComisiones: number;
  comisionVentas: number;
  comisionServicios: number;
  cantidadComisiones: number;
  porcentajeVentas: number;
  porcentajeServicios: number;
  isLoading?: boolean;
}

export default function CommissionsStatsCards({
  totalComisiones,
  comisionVentas,
  comisionServicios,
  cantidadComisiones,
  porcentajeVentas,
  porcentajeServicios,
  isLoading = false
}: CommissionsStatsCardsProps) {
  if (isLoading) {
    return (
      <div className='grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6'>
        {[1, 2, 3, 4].map(i => (
          <Card
            key={i}
            className='shadow-xs border-none backdrop-blur-xs rounded-3xl overflow-hidden h-[140px]'
          >
            <CardContent className='p-5 h-full flex flex-col justify-between'>
              <div className='flex justify-between'>
                <Skeleton className='h-10 w-10 rounded-2xl' />
                <Skeleton className='h-6 w-20 rounded-full' />
              </div>
              <div className='space-y-2 mt-4'>
                <Skeleton className='h-3 w-24' />
                <Skeleton className='h-8 w-28' />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className='grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6'>
      {}
      <MetricCard
        tone='emerald'
        icon={<DollarSign className='h-4 w-4 text-emerald-600' />}
        badge='Total'
        label='Total Comisiones'
        value={formatCurrencyCLP(totalComisiones)}
        footer={
          <div className='flex items-center gap-1.5 pt-1'>
            <span className='text-[10px] text-emerald-700/50 font-medium uppercase tracking-tighter italic'>
              Acumulado en caja activa
            </span>
          </div>
        }
      />

      {}
      <MetricCard
        tone='blue'
        icon={<TrendingUp className='h-4 w-4 text-blue-600' />}
        badge='Ventas'
        label='Por Ventas'
        value={formatCurrencyCLP(comisionVentas)}
        footer={
          <div className='flex items-center gap-1.5 pt-1'>
            <span className='text-blue-700 font-black text-sm'>{porcentajeVentas}%</span>
            <span className='text-[10px] text-blue-700/50 font-medium uppercase tracking-tighter italic'>
              del total
            </span>
          </div>
        }
      />

      {}
      <MetricCard
        tone='violet'
        icon={<Clock className='h-4 w-4 text-violet-600' />}
        badge='Servicios'
        label='Por Servicios'
        value={formatCurrencyCLP(comisionServicios)}
        footer={
          <div className='flex items-center gap-1.5 pt-1'>
            <span className='text-violet-700 font-black text-sm'>{porcentajeServicios}%</span>
            <span className='text-[10px] text-violet-700/50 font-medium uppercase tracking-tighter italic'>
              del total
            </span>
          </div>
        }
      />

      {}
      <MetricCard
        tone='orange'
        icon={<Users className='h-4 w-4 text-orange-600' />}
        badge='Personal'
        label='Anfitrionas'
        value={cantidadComisiones}
        footer={
          <div className='flex items-center gap-1.5 pt-1'>
            <span className='text-[10px] text-orange-700/50 font-medium uppercase tracking-tighter italic'>
              Con comisiones registradas
            </span>
          </div>
        }
      />
    </div>
  );
}
