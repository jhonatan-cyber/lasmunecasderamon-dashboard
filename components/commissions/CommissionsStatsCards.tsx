'use client';

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
  isLoading = false,
}: CommissionsStatsCardsProps) {
  if (isLoading) {
    return (
      <div className='grid gap-4 grid-cols-1 md:grid-cols-4 mb-6'>
        {[1, 2, 3, 4].map((i) => (
          <Card
            key={i}
            className='shadow-sm border-none backdrop-blur-sm rounded-3xl overflow-hidden h-[140px]'
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
    <div className='grid gap-4 grid-cols-1 md:grid-cols-4 mb-6'>
      {/* Total Comisiones */}
      <Card
        style={{
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
        }}
        className='shadow-sm border-none backdrop-blur-sm rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-emerald-500/20 rounded-2xl'>
              <DollarSign className='h-4 w-4 text-emerald-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-emerald-700 bg-emerald-500/10 px-2 py-1 rounded-full'>
              Total
            </span>
          </div>
          <div className='space-y-0.5'>
            <p className='text-[10px] font-bold text-emerald-700/60 uppercase tracking-widest'>
              Total Comisiones
            </p>
            <h3 className='text-xl font-black text-emerald-900 dark:text-emerald-100'>
              {formatCurrencyCLP(totalComisiones)}
            </h3>
            <div className='flex items-center gap-1.5 pt-1'>
              <span className='text-[10px] text-emerald-700/50 font-medium uppercase tracking-tighter italic'>
                Acumulado en caja activa
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Por Ventas */}
      <Card
        style={{
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
        }}
        className='shadow-sm border-none backdrop-blur-sm rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-blue-500/20 rounded-2xl'>
              <TrendingUp className='h-4 w-4 text-blue-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-blue-700 bg-blue-500/10 px-2 py-1 rounded-full'>
              Ventas
            </span>
          </div>
          <div className='space-y-0.5'>
            <p className='text-[10px] font-bold text-blue-700/60 uppercase tracking-widest'>
              Por Ventas
            </p>
            <h3 className='text-xl font-black text-blue-900 dark:text-blue-100'>
              {formatCurrencyCLP(comisionVentas)}
            </h3>
            <div className='flex items-center gap-1.5 pt-1'>
              <span className='text-blue-700 font-black text-sm'>{porcentajeVentas}%</span>
              <span className='text-[10px] text-blue-700/50 font-medium uppercase tracking-tighter italic'>
                del total
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Por Servicios */}
      <Card
        style={{
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
        }}
        className='shadow-sm border-none backdrop-blur-sm rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-violet-500/20 rounded-2xl'>
              <Clock className='h-4 w-4 text-violet-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-violet-700 bg-violet-500/10 px-2 py-1 rounded-full'>
              Servicios
            </span>
          </div>
          <div className='space-y-0.5'>
            <p className='text-[10px] font-bold text-violet-700/60 uppercase tracking-widest'>
              Por Servicios
            </p>
            <h3 className='text-xl font-black text-violet-900 dark:text-violet-100'>
              {formatCurrencyCLP(comisionServicios)}
            </h3>
            <div className='flex items-center gap-1.5 pt-1'>
              <span className='text-violet-700 font-black text-sm'>{porcentajeServicios}%</span>
              <span className='text-[10px] text-violet-700/50 font-medium uppercase tracking-tighter italic'>
                del total
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Anfitrionas */}
      <Card
        style={{
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          border: '1px solid rgba(249, 115, 22, 0.2)',
        }}
        className='shadow-sm border-none backdrop-blur-sm rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-orange-500/20 rounded-2xl'>
              <Users className='h-4 w-4 text-orange-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-orange-700 bg-orange-500/10 px-2 py-1 rounded-full'>
              Personal
            </span>
          </div>
          <div className='space-y-0.5'>
            <p className='text-[10px] font-bold text-orange-700/60 uppercase tracking-widest'>
              Anfitrionas
            </p>
            <h3 className='text-xl font-black text-orange-900 dark:text-orange-100'>
              {cantidadComisiones}
            </h3>
            <div className='flex items-center gap-1.5 pt-1'>
              <span className='text-[10px] text-orange-700/50 font-medium uppercase tracking-tighter italic'>
                Con comisiones registradas
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
