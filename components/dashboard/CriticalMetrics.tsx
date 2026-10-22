'use client';

import {
  AlertTriangle,
  DollarSign,
  Receipt,
  TrendingDown,
  TrendingUp,
  Activity
} from 'lucide-react';
import {
  type DashboardTrend,
  useDashboardComposite
} from '@/hooks/statistics/useDashboardComposite';
import { cn } from '@/lib/utils/utils';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { MetricCard } from '@/components/shared/MetricCard';

function TrendBadge({ trend }: { trend?: DashboardTrend }) {
  if (!trend) return null;

  const isUp = trend.direction === 'up';
  const isDown = trend.direction === 'down';
  const Icon = isDown ? TrendingDown : TrendingUp;

  if (trend.direction === 'flat') {
    return (
      <div className='flex items-center px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'>
        <span className='text-[10px] font-black text-slate-500'>=</span>
      </div>
    );
  }

  const bgClass = isUp
    ? 'bg-emerald-500/10 border-emerald-500/20'
    : 'bg-rose-500/10 border-rose-500/20';

  const textClass = isUp
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-rose-600 dark:text-rose-400';

  return (
    <div className={cn('flex items-center gap-0.5 px-2 py-0.5 rounded-full border', bgClass)}>
      <Icon className={cn('h-3 w-3', textClass)} />
      <span className={cn('text-[10px] font-black', textClass)}>
        {Math.abs(trend.percentChange)}%
      </span>
    </div>
  );
}

function CriticalAlert({ count, label }: { count: number; label: string }) {
  if (count === 0) return null;

  return (
    <div className='flex items-center gap-1 mt-2'>
      <div className='relative'>
        <AlertTriangle className='h-3 w-3 text-rose-500' />
        <div className='absolute inset-0 bg-rose-500 blur-xs opacity-50 animate-pulse' />
      </div>
      <span className='text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-tighter'>
        {count} {label}
      </span>
    </div>
  );
}

export default function CriticalMetrics() {
  const { data: composite, isLoading: loading, error } = useDashboardComposite();

  const businessStats = composite?.cajaStats;
  const insights = composite?.insights;

  const sales = Number(businessStats?.total_ventas || 0);
  const services = Number(businessStats?.total_servicios || 0);
  const openingAmount = Number(businessStats?.monto_apertura || 0);
  const movement =
    Number(businessStats?.total_efectivo || 0) +
    Number(businessStats?.total_tarjeta || 0) +
    Number(businessStats?.total_transferencia || 0) -
    openingAmount;

  const pendingOrders = insights?.localStatus.orders.open || 0;
  const expiringServices = insights?.localStatus.services.expiringSoon || 0;

  if (loading) {
    return (
      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full'>
        {Array.from({ length: 4 }, (_, index) => (
          <MetricCard key={index} icon={<Activity />} label='Cargando' value='' isLoading />
        ))}
      </div>
    );
  }

  if (error || !businessStats || !insights) {
    return (
      <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200'>
        Error al cargar métricas críticas.
      </div>
    );
  }

  const kpis = [
    {
      label: 'Monto de apertura',
      value: formatCurrencyCLP(openingAmount),
      description: 'Fondo inicial de la caja',
      icon: DollarSign,
      color: 'amber' as const,
      trend: undefined,
      alert: null
    },
    {
      label: 'Ventas Totales',
      value: formatCurrencyCLP(sales),
      icon: TrendingUp,
      color: 'emerald' as const,
      trend: insights.comparisons.salesToday,
      alert: pendingOrders > 0 ? { count: pendingOrders, label: 'pendientes' } : null
    },
    {
      label: 'Servicios Realizados',
      value: formatCurrencyCLP(services),
      icon: Receipt,
      color: 'indigo' as const,
      trend: insights.comparisons.servicesToday,
      alert: expiringServices > 0 ? { count: expiringServices, label: 'por vencer' } : null
    },
    {
      label: 'Flujo de Caja',
      description: 'Sin incluir el monto de apertura',
      value: formatCurrencyCLP(movement),
      icon: Activity,
      color: 'amber' as const,
      trend: insights.comparisons.movementToday
    }
  ];

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full'>
      {kpis.map(kpi => {
        const Icon = kpi.icon;
        return (
          <MetricCard
            key={kpi.label}
            icon={<Icon />}
            badge={<TrendBadge trend={kpi.trend} />}
            label={kpi.label}
            value={kpi.value}
            footer={
              <>
                {kpi.description && (
                  <p className='pt-1 text-xs font-medium opacity-70'>{kpi.description}</p>
                )}
                {kpi.alert && <CriticalAlert count={kpi.alert.count} label={kpi.alert.label} />}
              </>
            }
            tone={kpi.color}
          />
        );
      })}
    </div>
  );
}
