'use client';

import { AlertTriangle, Gauge, Target } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import {
  type DashboardInsightsResponse,
  useDashboardComposite
} from '@/hooks/statistics/useDashboardComposite';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/utils';
import { DashboardEmpty, DashboardError } from '@/components/dashboard/DashboardFeedback';
import { PanelHeading } from '@/components/dashboard/DashboardHeading';

const toneStyles = {
  success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
  critical: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400'
} as const;

type DashboardForecast = DashboardInsightsResponse['forecast'];

function describeForecast(forecast?: DashboardForecast) {
  if (!forecast) return '';
  if (forecast.status === 'ready') {
    const hours = Math.round((forecast.expectedMinutes / 60) * 10) / 10;
    return `Basado en ${forecast.historyCount} turnos cerrados. Duración estimada: ${hours} h.`;
  }
  if (forecast.status === 'closed') {
    return 'Abre una caja para estimar las ventas del turno.';
  }
  if (forecast.elapsedMinutesToday > 24 * 60) {
    return 'La caja lleva más de 24 horas abierta. Revisa el cierre del turno anterior.';
  }
  return [
    forecast.historyCount < 3 || !forecast.expectedMinutes
      ? `Hay ${forecast.historyCount} turnos cerrados válidos; se necesitan al menos 3, con una duración de hasta 24 horas.`
      : '',
    forecast.elapsedMinutesToday < 30
      ? `La caja lleva ${Math.floor(forecast.elapsedMinutesToday)} minutos abierta; la estimación comienza a los 30 minutos.`
      : ''
  ]
    .filter(Boolean)
    .join(' ');
}

export default function ForecastInsights() {
  const { data: composite, isLoading, error } = useDashboardComposite();
  const data = composite?.insights;
  const forecastExplanation = describeForecast(data?.forecast);

  if (isLoading) {
    return (
      <div className='grid gap-6 grid-cols-1 lg:grid-cols-2'>
        <Skeleton className='h-60 w-full rounded-3xl' />
        <Skeleton className='h-60 w-full rounded-3xl' />
      </div>
    );
  }

  if (error || !data) {
    return <DashboardError>No se pudieron cargar las proyecciones del dashboard.</DashboardError>;
  }

  return (
    <div className='grid gap-6 grid-cols-1 lg:grid-cols-2'>
      <div className='flex flex-col gap-4'>
        <PanelHeading
          icon={Target}
          title='Cierre Estimado'
          description='Estimación por duración histórica del turno'
        />

        <div className='flex flex-col gap-4'>
          <div className='bg-slate-900 dark:bg-white rounded-2xl p-6 text-center space-y-1'>
            <span className='text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500'>
              Total Proyectado
            </span>
            <p className='text-2xl font-black tracking-tighter text-white dark:text-slate-900'>
              {data.forecast.projectedRevenue !== null
                ? formatCurrencyCLP(data.forecast.projectedRevenue)
                : data.forecast.status === 'closed'
                  ? 'Sin caja abierta'
                  : 'Sin datos suficientes'}
            </p>
            <p className='text-xs text-slate-400 dark:text-slate-500'>{forecastExplanation}</p>
            {data.forecast.status === 'closed' || data.forecast.elapsedMinutesToday > 24 * 60 ? (
              <Link
                href='/cash-register'
                className='inline-block text-xs font-bold underline text-white dark:text-slate-900'
              >
                Revisar caja
              </Link>
            ) : null}
          </div>

          <div className='grid grid-cols-2 gap-3 border-t border-slate-200 dark:border-slate-800 pt-4'>
            <div className='flex min-w-0 flex-col'>
              <span className='text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1'>
                Turno actual
              </span>
              <span className='text-sm font-black text-slate-900 dark:text-white'>
                {formatCurrencyCLP(data.forecast.currentRevenue)}
              </span>
            </div>
            <div className='flex min-w-0 flex-col'>
              <span className='text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1'>
                Último turno cerrado
              </span>
              <span className='text-sm font-black text-slate-900 dark:text-white'>
                {formatCurrencyCLP(data.forecast.yesterdayRevenue)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className='flex flex-col gap-4'>
        <PanelHeading
          icon={Gauge}
          title='Señales Críticas'
          description='Monitoreo de Anomalías'
          tone='amber'
        />

        <div className='space-y-3'>
          {data.forecast.anomalies.length === 0 ? (
            <DashboardEmpty className='border p-8'>No se detectan irregularidades</DashboardEmpty>
          ) : (
            data.forecast.anomalies.map(anomaly => (
              <div
                key={anomaly.id}
                className='flex flex-col gap-2 p-4 rounded-2xl border border-slate-200/60 bg-white dark:border-slate-800/60 dark:bg-slate-950/20'
              >
                <div className='flex items-center justify-between gap-2'>
                  <span className='text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight'>
                    {anomaly.title}
                  </span>
                  <div
                    className={cn(
                      'px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-tighter flex items-center gap-1',
                      toneStyles[anomaly.tone]
                    )}
                  >
                    <AlertTriangle className='h-3 w-3' />
                    {anomaly.tone === 'success'
                      ? 'Ok'
                      : anomaly.tone === 'warning'
                        ? 'Alert'
                        : 'Crit'}
                  </div>
                </div>
                <p className='text-[11px] font-medium text-slate-500 leading-relaxed'>
                  {anomaly.description}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
