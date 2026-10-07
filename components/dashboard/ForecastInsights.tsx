'use client';

import { AlertTriangle, Gauge, Target } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardComposite } from '@/hooks/stats/useDashboardComposite';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/utils';

const toneStyles = {
  success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
  critical: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400'
} as const;

export default function ForecastInsights() {
  const { data: composite, isLoading, error } = useDashboardComposite();
  const data = composite?.insights;
  const forecast = data?.forecast;
  const forecastExplanation = !forecast
    ? ''
    : forecast.status === 'ready'
      ? `Basado en ${forecast.historyCount} turnos cerrados. Duración estimada: ${Math.round((forecast.expectedMinutes / 60) * 10) / 10} h.`
      : forecast.status === 'closed'
        ? 'Abre una caja para estimar las ventas del turno.'
        : forecast.elapsedMinutesToday > 24 * 60
          ? 'La caja lleva más de 24 horas abierta. Revisa el cierre del turno anterior.'
          : [
              forecast.historyCount < 3 || !forecast.expectedMinutes
                ? `Hay ${forecast.historyCount} turnos cerrados válidos; se necesitan al menos 3, con una duración de hasta 24 horas.`
                : '',
              forecast.elapsedMinutesToday < 30
                ? `La caja lleva ${Math.floor(forecast.elapsedMinutesToday)} minutos abierta; la estimación comienza a los 30 minutos.`
                : ''
            ].filter(Boolean).join(' ');

  if (isLoading) {
    return (
      <div className='grid gap-6 grid-cols-1 lg:grid-cols-2'>
        <Skeleton className='h-60 w-full rounded-3xl' />
        <Skeleton className='h-60 w-full rounded-3xl' />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className='rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200'>
        No se pudieron cargar las proyecciones del dashboard.
      </div>
    );
  }

  return (
    <div className='grid gap-6 grid-cols-1 lg:grid-cols-2'>
      {}
      <div className='flex flex-col gap-4'>
        <div className='flex items-center gap-3 px-1'>
          <div className='p-2 rounded-xl bg-emerald-500/10 text-emerald-500'>
            <Target className='h-4 w-4' />
          </div>
          <div className='flex flex-col'>
            <span className='text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white'>
              Cierre Estimado
            </span>
            <span className='text-[10px] font-bold text-slate-400 uppercase tracking-tighter'>
              Estimación por duración histórica del turno
            </span>
          </div>
        </div>

        <div className='flex flex-col gap-4 rounded-3xl border border-slate-200/60 bg-white dark:border-slate-800/60 dark:bg-slate-950/20 p-5'>
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
            <p className='text-xs text-slate-400 dark:text-slate-500'>
              {forecastExplanation}
            </p>
            {data.forecast.status === 'closed' || data.forecast.elapsedMinutesToday > 24 * 60 ? (
              <Link href='/cash-register' className='inline-block text-xs font-bold underline text-white dark:text-slate-900'>
                Revisar caja
              </Link>
            ) : null}
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div className='flex flex-col p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800'>
              <span className='text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1'>
                Turno actual
              </span>
              <span className='text-sm font-black text-slate-900 dark:text-white'>
                {formatCurrencyCLP(data.forecast.currentRevenue)}
              </span>
            </div>
            <div className='flex flex-col p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800'>
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

      {}
      <div className='flex flex-col gap-4'>
        <div className='flex items-center gap-3 px-1'>
          <div className='p-2 rounded-xl bg-amber-500/10 text-amber-500'>
            <Gauge className='h-4 w-4' />
          </div>
          <div className='flex flex-col'>
            <span className='text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white'>
              Señales Críticas
            </span>
            <span className='text-[10px] font-bold text-slate-400 uppercase tracking-tighter'>
              Monitoreo de Anomalías
            </span>
          </div>
        </div>

        <div className='space-y-3'>
          {data.forecast.anomalies.length === 0 ? (
            <div className='rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center'>
              <p className='text-[10px] font-black uppercase tracking-widest text-slate-400'>
                No se detectan irregularidades
              </p>
            </div>
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
