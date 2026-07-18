import {
  DollarSign,
  TrendingUp,
  Calendar,
  Activity,
  CreditCard,
  ArrowUpDown,
  TrendingDown
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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

  const themeConfig = [
    {
      bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      borderColor: 'border-emerald-500/20',
      iconBg: 'bg-emerald-500/20',
      textColor: 'text-emerald-700 dark:text-emerald-400',
      textMuted: 'text-emerald-700/60 dark:text-emerald-400/60'
    },
    {
      bgColor: 'bg-blue-500/10 dark:bg-blue-500/20',
      borderColor: 'border-blue-500/20',
      iconBg: 'bg-blue-500/20',
      textColor: 'text-blue-700 dark:text-blue-400',
      textMuted: 'text-blue-700/60 dark:text-blue-400/60'
    },
    {
      bgColor: 'bg-amber-500/10 dark:bg-amber-500/20',
      borderColor: 'border-amber-500/20',
      iconBg: 'bg-amber-500/20',
      textColor: 'text-amber-700 dark:text-amber-400',
      textMuted: 'text-amber-700/60 dark:text-amber-400/60'
    },
    {
      bgColor: 'bg-purple-500/10 dark:bg-purple-500/20',
      borderColor: 'border-purple-500/20',
      iconBg: 'bg-purple-500/20',
      textColor: 'text-purple-700 dark:text-purple-400',
      textMuted: 'text-purple-700/60 dark:text-purple-400/60'
    },
    {
      bgColor: 'bg-rose-500/10 dark:bg-rose-500/20',
      borderColor: 'border-rose-500/20',
      iconBg: 'bg-rose-500/20',
      textColor: 'text-rose-700 dark:text-rose-400',
      textMuted: 'text-rose-700/60 dark:text-rose-400/60'
    }
  ];

  if (error) {
    return (
      <div className='text-red-600 dark:text-red-300 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-sm sm:text-base'>
        Error al cargar las estadísticas: {error}
      </div>
    );
  }

  const renderCard = (stat: any, index: number) => {
    const theme = themeConfig[index % themeConfig.length];
    return (
      <Card
        key={index}
        className={`shadow-xs backdrop-blur-xs rounded-4xl overflow-hidden group hover:scale-[1.02] transition-all duration-300 border ${theme.bgColor} ${theme.borderColor}`}
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className={`p-2.5 rounded-2xl ${theme.iconBg}`}>
              <stat.icon className={`h-4 w-4 ${theme.textColor}`} />
            </div>
            <span
              className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-full text-center ${theme.textColor} ${theme.iconBg}`}
            >
              {stat.title}
            </span>
          </div>
          <div className='space-y-0.5 text-center sm:text-left'>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${theme.textMuted}`}>
              {stat.title}
            </p>
            {isLoading ? (
              <Skeleton className='h-6 sm:h-8 w-20 sm:w-24 mt-1 mb-2' />
            ) : (
              <h3 className={`text-xl sm:text-2xl font-black ${theme.textColor} truncate`}>
                {stat.value}
              </h3>
            )}
            <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
              <span
                className={`text-[10px] font-medium uppercase tracking-tighter italic ${theme.textMuted} truncate`}
              >
                {stat.subtitle}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full'>
      {detailedStatsCards.map((stat, i) => renderCard(stat, i))}
    </div>
  );
}
