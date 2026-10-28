import { MetricCard } from '@/components/shared/MetricCard';
import { ErrorState } from '@/components/shared/ErrorState';
import { LucideIcon } from 'lucide-react';
import { formatCurrencyNoDecimals, formatNumberCL } from '@/lib/utils/formatters';

export interface StatCard {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  isLoading?: boolean;
  formatAsCurrency?: boolean;
  formatAsPercentage?: boolean;
  formatAsNumber?: boolean;
}

export interface StatsCardProps {
  stats: StatCard[];
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
  error?: string | null;
  isLoading?: boolean;
}

export function StatsCard({
  stats,
  columns = 4,
  className = 'mb-6 sm:mb-8',
  error,
  isLoading
}: StatsCardProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
    6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
  };

  const formatValue = (stat: StatCard) => {
    if (typeof stat.value === 'string') return stat.value;

    const numValue = Number(stat.value);

    if (stat.formatAsCurrency) {
      return formatCurrencyNoDecimals(Math.round(numValue));
    }

    if (stat.formatAsPercentage) {
      return `${Math.round(numValue)}%`;
    }

    if (stat.formatAsNumber) {
      return formatNumberCL(numValue);
    }

    return Math.round(numValue).toString();
  };

  if (error) {
    return <ErrorState size='sm' message={`Error al cargar las estadísticas: ${error}`} />;
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-4 sm:gap-6 ${className}`}>
      {stats.map((stat, index) => (
        <MetricCard
          key={index}
          icon={<stat.icon className='h-4 w-4' />}
          label={stat.title}
          value={formatValue(stat)}
          isLoading={Boolean(isLoading || stat.isLoading)}
          footer={stat.subtitle && <p className='mt-1 text-xs opacity-70'>{stat.subtitle}</p>}
        />
      ))}
    </div>
  );
}
