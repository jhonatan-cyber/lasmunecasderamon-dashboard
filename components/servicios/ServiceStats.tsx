"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Lock, Clock, DollarSign, Users } from 'lucide-react';
import { ServicioWithDetails } from '@/types/servicio';
import { calculateServiceStats } from '@/lib/business/serviceUtils';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

interface ServiceStatsProps {
  servicios: ServicioWithDetails[];
}

export default function ServiceStats({ servicios }: ServiceStatsProps) {
  
  const serviceStats = calculateServiceStats(servicios);

  return (
    <div className='grid gap-4 grid-cols-1 md:grid-cols-4 mb-6'>
      {}
      <Card
        style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}
        className='shadow-sm border-none backdrop-blur-sm rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-blue-500/20 rounded-2xl'>
              <Lock className='h-4 w-4 text-blue-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-blue-700 bg-blue-500/10 px-2 py-1 rounded-full'>
              Total
            </span>
          </div>
          <div className='space-y-0.5'>
            <p className='text-[10px] font-bold text-blue-700/60 uppercase tracking-widest'>Servicios</p>
            <h3 className='text-xl font-black text-blue-900 dark:text-blue-100'>
              {serviceStats.totalServicios}
            </h3>
          </div>
        </CardContent>
      </Card>

      {}
      <Card
        style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
        className='shadow-sm border-none backdrop-blur-sm rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-emerald-500/20 rounded-2xl'>
              <Clock className='h-4 w-4 text-emerald-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-emerald-700 bg-emerald-500/10 px-2 py-1 rounded-full'>
              Activos
            </span>
          </div>
          <div className='space-y-0.5'>
            <p className='text-[10px] font-bold text-emerald-700/60 uppercase tracking-widest'>En Proceso</p>
            <h3 className='text-xl font-black text-emerald-900 dark:text-emerald-100'>
              {serviceStats.serviciosActivos}
            </h3>
          </div>
        </CardContent>
      </Card>

      {}
      <Card
        style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)' }}
        className='shadow-sm border-none backdrop-blur-sm rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-amber-500/20 rounded-2xl'>
              <DollarSign className='h-4 w-4 text-amber-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-amber-700 bg-amber-500/10 px-2 py-1 rounded-full'>
              Ingresos
            </span>
          </div>
          <div className='space-y-0.5'>
            <p className='text-[10px] font-bold text-amber-700/60 uppercase tracking-widest'>Totales</p>
            <h3 className='text-xl font-black text-amber-900 dark:text-amber-100'>
              {formatCurrencyCLP(serviceStats.ingresosTotales)}
            </h3>
          </div>
        </CardContent>
      </Card>

      {}
      <Card
        style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)' }}
        className='shadow-sm border-none backdrop-blur-sm rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-violet-500/20 rounded-2xl'>
              <Users className='h-4 w-4 text-violet-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-violet-700 bg-violet-500/10 px-2 py-1 rounded-full'>
              Tiempo
            </span>
          </div>
          <div className='space-y-0.5'>
            <p className='text-[10px] font-bold text-violet-700/60 uppercase tracking-widest'>Promedio</p>
            <h3 className='text-xl font-black text-violet-900 dark:text-violet-100'>
              {serviceStats.promedioTiempo}m
            </h3>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}