import { MetricCard } from '@/components/shared/MetricCard';
import { DollarSign, TrendingUp, Activity, CreditCard, ArrowUpDown } from 'lucide-react';

import { useCashRegister } from '@/hooks/cash-register/useCashRegister';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';

interface CashRegisterStatsCardProps {
  isCajero?: boolean;
}

export function CashRegisterStatsCard({ isCajero = false }: CashRegisterStatsCardProps) {
  const { resumen: stats, loading: isLoading, error } = useCashRegister();

  const statsCards = [
    {
      title: 'Total Ventas',
      value: formatCurrencyNoDecimals(stats?.total_ventas || 0),
      subtitle: `${stats?.cantidad_ventas || 0} ventas realizadas`,
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
      title: 'Total Efectivo',
      value: formatCurrencyNoDecimals(stats?.total_efectivo || 0),
      subtitle: isCajero ? 'Efectivo en tu caja' : 'Ingresos en efectivo',
      icon: DollarSign,
      formatAsCurrency: false
    },
    {
      title: 'Total Tarjeta',
      value: formatCurrencyNoDecimals(stats?.total_tarjeta || 0),
      subtitle: isCajero ? 'Pagos con tarjeta en tu caja' : 'Pagos con tarjeta',
      icon: CreditCard,
      formatAsCurrency: false
    },
    {
      title: 'Total Transferencias',
      value: formatCurrencyNoDecimals(stats?.total_transferencia || 0),
      subtitle: isCajero ? 'Transferencias en tu caja' : 'Transferencias bancarias',
      icon: ArrowUpDown,
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

  const renderCard = (stat: (typeof statsCards)[number], index: number) => (
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
    <div className='space-y-4 w-full'>
      <div className='grid grid-cols-2 gap-4 w-full'>
        {statsCards.slice(0, 2).map((stat, i) => renderCard(stat, i))}
      </div>
      <div className='grid grid-cols-2 lg:grid-cols-3 gap-4 w-full'>
        {statsCards.slice(2, 5).map((stat, i) => (
          <div key={i + 2} className={i === 2 ? 'col-span-2 lg:col-span-1' : ''}>
            {renderCard(stat, i + 2)}
          </div>
        ))}
      </div>
    </div>
  );
}
