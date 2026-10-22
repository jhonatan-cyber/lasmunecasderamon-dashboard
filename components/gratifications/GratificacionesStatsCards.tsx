'use client';

import { MetricCard } from '@/components/shared/MetricCard';
import { Gift, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { Gratificacion } from '@/types/gratificacion';

interface GratificacionesStatsCardsProps {
  gratificaciones: Gratificacion[];
  formatCurrency: (amount: number) => string;
}

export default function GratificacionesStatsCards({
  gratificaciones,
  formatCurrency
}: GratificacionesStatsCardsProps) {
  const totalRegistros = gratificaciones.length;
  const usuariosUnicos = new Set(gratificaciones.map(g => g.usuario_id || g.id_usuario));
  const totalUsuarios = usuariosUnicos.size;

  const totalMonto = gratificaciones.reduce((acc, g) => acc + g.monto, 0);
  const totalPagado = gratificaciones
    .filter(g => g.estado === 0)
    .reduce((acc, g) => acc + g.monto, 0);
  const totalPorPagar = gratificaciones
    .filter(g => g.estado === 1)
    .reduce((acc, g) => acc + g.monto, 0);

  const stats = [
    {
      title: 'Total Registros',
      value: totalRegistros,
      subtitle: 'Entradas totales',
      icon: Gift,
      tone: 'blue' as const
    },
    {
      title: 'Total Pagado',
      value: formatCurrency(totalPagado),
      subtitle: 'Liquidaciones cerradas',
      icon: CheckCircle2,
      tone: 'emerald' as const
    },
    {
      title: 'Por Pagar',
      value: formatCurrency(totalPorPagar),
      subtitle: 'Pendiente de cobro',
      icon: Clock,
      tone: 'amber' as const
    },
    {
      title: 'Último Promedio',
      value: formatCurrency(totalUsuarios > 0 ? totalMonto / totalUsuarios : 0),
      subtitle: `${totalUsuarios} usuarios activos`,
      icon: TrendingUp,
      tone: 'indigo' as const
    }
  ];

  return (
    <div className='grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6'>
      {stats.map(stat => (
        <MetricCard
          key={stat.title}
          icon={<stat.icon />}
          badge={stat.title}
          label={stat.subtitle}
          value={stat.value}
          tone={stat.tone}
        />
      ))}
    </div>
  );
}
