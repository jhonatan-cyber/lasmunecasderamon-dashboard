import { MetricCard } from '@/components/shared/MetricCard';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Activity,
  CreditCard,
  ArrowUpDown,
  TrendingDown
} from 'lucide-react';

import { useCashRegister } from '@/hooks/caja/useCashRegister';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';

export function CashRegisterDetailedStats() {
  const { resumen: stats, loading: isLoading, error } = useCashRegister();

  const detailedStatsCards = [
    {
      title: 'Total Ventas',
      value: formatCurrencyNoDecimals(stats?.total_ventas || 0),
      subtitle: `${stats?.cantidad_ventas || 0} ventas realizadas`,
      icon: TrendingUp,
      formatAsCurrency: false
    },
    {
      title: 'Total Efectivo',
      value: formatCurrencyNoDecimals(stats?.total_efectivo || 0),
      subtitle: 'Ingresos en efectivo',
      icon: DollarSign,
      formatAsCurrency: false
    },
    {
      title: 'Total Tarjeta',
      value: formatCurrencyNoDecimals(stats?.total_tarjeta || 0),
      subtitle: 'Pagos con tarjeta',
      icon: CreditCard,
      formatAsCurrency: false
    },
    {
      title: 'Total Transferencias',
      value: formatCurrencyNoDecimals(stats?.total_transferencia || 0),
      subtitle: 'Transferencias bancarias',
      icon: ArrowUpDown,
      formatAsCurrency: false
    },
    {
      title: 'Promedio Venta',
      value: formatCurrencyNoDecimals(stats?.promedio_venta || 0),
      subtitle: 'Por transacción',
      icon: TrendingUp,
      formatAsCurrency: false
    },
    {
      title: 'Total Servicios',
      value: formatCurrencyNoDecimals(stats?.total_servicios || 0),
      subtitle: `${stats?.cantidad_servicios || 0} servicios realizados`,
      icon: Activity,
      formatAsCurrency: false
    },
    {
      title: 'Promedio Servicio',
      value: formatCurrencyNoDecimals(stats?.promedio_servicio || 0),
      subtitle: 'Por servicio',
      icon: Calendar,
      formatAsCurrency: false
    },
    {
      title: 'Total Devoluciones',
      value: formatCurrencyNoDecimals(stats?.total_devoluciones || 0),
      subtitle: 'Devoluciones realizadas',
      icon: TrendingDown,
      formatAsCurrency: false
    }
  ];

  const cardTones = ['emerald', 'blue', 'amber', 'purple', 'rose'] as const;

  if (error) {
    return (
      <div className='text-red-600 dark:text-red-300 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-sm sm:text-base'>
        Error al cargar las estadísticas: {error}
      </div>
    );
  }

  const renderCard = (stat: (typeof detailedStatsCards)[number], index: number) => (
    <MetricCard
      key={index}
      tone={cardTones[index % cardTones.length]}
      icon={<stat.icon className='h-4 w-4' />}
      badge={stat.title}
      label={stat.title}
      value={stat.value}
      isLoading={isLoading}
      footer={<p className='pt-1 text-xs opacity-70'>{stat.subtitle}</p>}
    />
  );

  return (
    <div className='grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full'>
      {detailedStatsCards.map((stat, i) => renderCard(stat, i))}
    </div>
  );
}
