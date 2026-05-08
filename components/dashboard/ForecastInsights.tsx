'use client';

import { AlertTriangle, Gauge, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/shared/Skeletons';
import { useDashboardInsights } from '@/hooks/stats/useDashboardInsights';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/utils';

const toneStyles = {
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200',
  critical: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200'
} as const;

export default function ForecastInsights() {
  const { data, isLoading, error } = useDashboardInsights();

  if (isLoading) {
    return (
      <Card className='border-slate-200/80 dark:border-slate-800'>
        <CardHeader className='space-y-3'>
          <Skeleton className='h-6 w-52' />
          <Skeleton className='h-4 w-64' />
        </CardHeader>
        <CardContent className='grid gap-4 lg:grid-cols-[1.1fr_0.9fr]'>
          <Skeleton className='h-40 w-full rounded-3xl' />
          <Skeleton className='h-40 w-full rounded-3xl' />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null;
  }

  return (
    <section className='space-y-4'>
      <div>
        <h2 className='text-xl font-semibold text-slate-900 dark:text-slate-100'>
          Forecast Y Anomalías
        </h2>
        <p className='mt-1 text-sm text-slate-600 dark:text-slate-400'>
          Proyección simple del cierre del día y focos que merecen atención mientras el turno sigue
          abierto.
        </p>
      </div>

      <div className='grid gap-4 lg:grid-cols-[1.1fr_0.9fr]'>
        <Card className='overflow-hidden border-slate-200/80 dark:border-slate-800'>
          <CardHeader className='border-b border-slate-200/80 bg-gradient-to-r from-slate-50 to-white dark:border-slate-800 dark:from-slate-950 dark:to-slate-900'>
            <CardTitle className='flex items-center gap-2 text-lg'>
              <TrendingUp className='h-5 w-5 text-emerald-500' />
              Proyección de cierre
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-6 p-5'>
            <div className='rounded-3xl bg-slate-900 p-5 text-white dark:bg-slate-100 dark:text-slate-900'>
              <p className='text-xs uppercase tracking-[0.2em] text-white/70 dark:text-slate-500'>
                Proyección del día
              </p>
              <p className='mt-2 text-4xl font-bold tracking-tight'>
                {formatCurrencyCLP(data.forecast.projectedRevenue)}
              </p>
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <div className='rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800'>
                <p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
                  Acumulado actual
                </p>
                <p className='mt-2 text-2xl font-bold text-slate-950 dark:text-white'>
                  {formatCurrencyCLP(data.forecast.currentRevenue)}
                </p>
              </div>
              <div className='rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800'>
                <p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
                  Referencia de ayer
                </p>
                <p className='mt-2 text-2xl font-bold text-slate-950 dark:text-white'>
                  {formatCurrencyCLP(data.forecast.yesterdayRevenue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='border-slate-200/80 dark:border-slate-800'>
          <CardHeader className='border-b border-slate-200/80 pb-4 dark:border-slate-800'>
            <CardTitle className='flex items-center gap-2 text-lg'>
              <Gauge className='h-5 w-5 text-amber-500' />
              Señales del turno
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3 p-5'>
            {data.forecast.anomalies.length === 0 ? (
              <div className='rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400'>
                No se detectaron anomalías relevantes en este momento.
              </div>
            ) : (
              data.forecast.anomalies.map(anomaly => (
                <div
                  key={anomaly.id}
                  className='rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/30'
                >
                  <div className='flex items-center justify-between gap-3'>
                    <p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
                      {anomaly.title}
                    </p>
                    <Badge
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[11px]',
                        toneStyles[anomaly.tone]
                      )}
                    >
                      <AlertTriangle className='mr-1 h-3 w-3' />
                      {anomaly.tone === 'success'
                        ? 'Oportunidad'
                        : anomaly.tone === 'warning'
                          ? 'Atención'
                          : 'Crítica'}
                    </Badge>
                  </div>
                  <p className='mt-2 text-sm text-slate-600 dark:text-slate-400'>
                    {anomaly.description}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
