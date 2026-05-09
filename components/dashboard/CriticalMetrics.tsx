'use client';

import {
  AlertTriangle,
  DollarSign,
  Receipt,
  TrendingDown,
  TrendingUp,
  Activity
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/shared/Skeletons';
import { type DashboardTrend, useDashboardComposite } from '@/hooks/stats/useDashboardComposite';
import { cn } from '@/lib/utils/utils';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

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
    <div className='flex items-center gap-1 mt-2 px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20'>
      <div className='relative'>
        <AlertTriangle className='h-3 w-3 text-rose-500' />
        <div className='absolute inset-0 bg-rose-500 blur-sm opacity-50 animate-pulse' />
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
  const movement =
    Number(businessStats?.total_efectivo || 0) +
    Number(businessStats?.total_tarjeta || 0) +
    Number(businessStats?.total_transferencia || 0);

  const pendingOrders = insights?.localStatus.orders.open || 0;
  const expiringServices = insights?.localStatus.services.expiringSoon || 0;

  if (loading) {
    return (
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 w-full'>
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className='h-28 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/20 animate-pulse'
          />
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
      label: 'Ventas Totales',
      value: formatCurrencyCLP(sales),
      icon: TrendingUp,
      color: 'emerald',
      trend: insights.comparisons.salesToday,
      alert: pendingOrders > 0 ? { count: pendingOrders, label: 'pendientes' } : null
    },
    {
      label: 'Servicios Realizados',
      value: formatCurrencyCLP(services),
      icon: Receipt,
      color: 'indigo',
      trend: insights.comparisons.servicesToday,
      alert: expiringServices > 0 ? { count: expiringServices, label: 'por vencer' } : null
    },
    {
      label: 'Flujo de Caja',
      value: formatCurrencyCLP(movement),
      icon: Activity,
      color: 'amber',
      trend: insights.comparisons.movementToday
    }
  ];

  return (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-4 w-full'>
      {kpis.map(kpi => {
        const Icon = kpi.icon;
        const colorClass =
          kpi.color === 'emerald'
            ? 'text-emerald-500 bg-emerald-500/10'
            : kpi.color === 'indigo'
              ? 'text-indigo-500 bg-indigo-500/10'
              : 'text-amber-500 bg-amber-500/10';

        return (
          <div
            key={kpi.label}
            className='group relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-950/40 p-5 shadow-lg shadow-slate-200/40 dark:shadow-none transition-all hover:border-slate-300 dark:hover:border-slate-700'
          >
            {/* Background decoration */}
            <div
              className={cn(
                'absolute -right-4 -top-4 h-24 w-24 rounded-full blur-3xl opacity-5 dark:opacity-10',
                kpi.color === 'emerald'
                  ? 'bg-emerald-500'
                  : kpi.color === 'indigo'
                    ? 'bg-indigo-500'
                    : 'bg-amber-500'
              )}
            />

            <div className='flex items-start justify-between'>
              <div className={cn('p-2.5 rounded-xl', colorClass)}>
                <Icon className='h-5 w-5' />
              </div>
              <TrendBadge trend={kpi.trend} />
            </div>

            <div className='mt-4 space-y-1'>
              <p className='text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500'>
                {kpi.label}
              </p>
              <h3 className='text-2xl font-black tracking-tighter text-slate-900 dark:text-white'>
                {kpi.value}
              </h3>
            </div>

            {kpi.alert && <CriticalAlert count={kpi.alert.count} label={kpi.alert.label} />}

            {/* Subtle bottom progress-like bar */}
            <div className='absolute bottom-0 left-0 h-1 bg-slate-100 dark:bg-slate-800 w-full overflow-hidden'>
              <div
                className={cn(
                  'h-full w-1/3 rounded-full opacity-50',
                  kpi.color === 'emerald'
                    ? 'bg-emerald-500'
                    : kpi.color === 'indigo'
                      ? 'bg-indigo-500'
                      : 'bg-amber-500'
                )}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
