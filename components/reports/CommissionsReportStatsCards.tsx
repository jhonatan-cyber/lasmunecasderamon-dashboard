'use client';

import { MetricCard } from '@/components/shared/MetricCard';
import { TrendingUp, Users, DollarSign, Award, Target } from 'lucide-react';
import type { Statistics } from './hooks/useCommissionsReport';
import { formatNumber } from './reportFormatters';

interface CommissionsStatsCardsProps {
  statistics: Statistics;
}

export function CommissionsReportStatsCards({ statistics }: CommissionsStatsCardsProps) {
  const stats = [
    {
      title: 'Anfitrionas Activas',
      value: statistics.total_anfitrionas,
      icon: Users,
      tone: 'blue' as const
    },
    {
      title: 'Ventas Generadas',
      value: `$${formatNumber(statistics.total_ventas_general)}`,
      sub: `${statistics.total_ventas_count} transacciones`,
      icon: TrendingUp,
      tone: 'emerald' as const
    },
    {
      title: 'Servicios Realizados',
      value: `$${formatNumber(statistics.total_servicios_general)}`,
      sub: `${statistics.total_servicios_count} servicios`,
      icon: Target,
      tone: 'violet' as const
    },
    {
      title: 'Comisiones Totales',
      value: `$${formatNumber(statistics.total_comisiones_general)}`,
      icon: DollarSign,
      tone: 'purple' as const
    },
    {
      title: 'Promedio x Anfitriona',
      value: `$${formatNumber(Math.round(statistics.promedio_comision_por_anfitriona || 0))}`,
      icon: Award,
      tone: 'orange' as const
    }
  ];

  return (
    <div className='grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-6'>
      {stats.map(stat => (
        <MetricCard
          key={stat.title}
          icon={<stat.icon />}
          badge={stat.sub ?? 'General'}
          label={stat.title}
          value={stat.value}
          tone={stat.tone}
        />
      ))}
    </div>
  );
}
