'use client';
import { MetricCard } from '@/components/shared/MetricCard';

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
    <div className='grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6'>
      {}
      <MetricCard
        tone='blue'
        icon={<Lock className='h-4 w-4 text-blue-600' />}
        badge='Total'
        label='Servicios'
        value={serviceStats.totalServicios}
      />

      {}
      <MetricCard
        tone='emerald'
        icon={<Clock className='h-4 w-4 text-emerald-600' />}
        badge='Activos'
        label='En Proceso'
        value={serviceStats.serviciosActivos}
      />

      {}
      <MetricCard
        tone='amber'
        icon={<DollarSign className='h-4 w-4 text-amber-600' />}
        badge='Ingresos'
        label='Totales'
        value={formatCurrencyCLP(serviceStats.ingresosTotales)}
      />

      {}
      <MetricCard
        tone='violet'
        icon={<Users className='h-4 w-4 text-violet-600' />}
        badge='Tiempo'
        label='Promedio'
        value={<>{serviceStats.promedioTiempo}m</>}
      />
    </div>
  );
}
