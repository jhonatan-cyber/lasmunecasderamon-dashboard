'use client';

import { Activity, DollarSign, LogIn, ShoppingCart, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/shared/Skeletons';
import { useRecentActivity } from '@/hooks/stats/useRecentActivity';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

const activityStyles = {
  venta: { icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-300' },
  servicio: { icon: Sparkles, color: 'text-indigo-600 dark:text-indigo-300' },
  pedido: { icon: ShoppingCart, color: 'text-amber-600 dark:text-amber-300' },
  login: { icon: LogIn, color: 'text-sky-600 dark:text-sky-300' },
  default: { icon: Activity, color: 'text-slate-600 dark:text-slate-300' }
} as const;

function formatRelativeTime(dateString: string) {
  const diffMinutes = Math.round((new Date(dateString).getTime() - Date.now()) / (1000 * 60));
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour');
  }

  return rtf.format(Math.round(diffHours / 24), 'day');
}

export default function RecentActivityFeed() {
  const { data, isLoading, error } = useRecentActivity();

  if (isLoading) {
    return (
      <Card className='border-slate-200/80 dark:border-slate-800'>
        <CardHeader className='space-y-3'>
          <Skeleton className='h-6 w-44' />
          <Skeleton className='h-4 w-64' />
        </CardHeader>
        <CardContent className='space-y-3'>
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className='rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800'
            >
              <Skeleton className='mb-2 h-4 w-40' />
              <Skeleton className='mb-2 h-3 w-28' />
              <Skeleton className='h-3 w-full' />
            </div>
          ))}
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
          Actividad En Tiempo Real
        </h2>
        <p className='mt-1 text-sm text-slate-600 dark:text-slate-400'>
          Feed reciente de ventas, servicios, pedidos e ingresos a plataforma para seguir el pulso
          del local.
        </p>
      </div>

      <Card className='border-slate-200/80 dark:border-slate-800'>
        <CardHeader className='border-b border-slate-200/80 pb-4 dark:border-slate-800'>
          <CardTitle className='text-lg'>Últimos movimientos</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3 p-5'>
          {data.length === 0 ? (
            <div className='rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400'>
              No hay actividad reciente para mostrar.
            </div>
          ) : (
            data.map(activity => {
              const style =
                activityStyles[activity.type as keyof typeof activityStyles] ||
                activityStyles.default;
              const Icon = style.icon;

              return (
                <div
                  key={activity.id}
                  className='flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/30'
                >
                  <div className='flex items-center gap-3'>
                    <div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800'>
                      <Icon className={`h-5 w-5 ${style.color}`} />
                    </div>
                    <div>
                      <p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
                        {activity.description}
                      </p>
                      <p className='mt-1 text-sm text-slate-600 dark:text-slate-400'>
                        {activity.metadata || 'Sin detalle adicional'}
                      </p>
                    </div>
                  </div>

                  <div className='text-right'>
                    <p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
                      {activity.amount !== null ? formatCurrencyCLP(activity.amount) : 'Evento'}
                    </p>
                    <p className='mt-1 text-xs text-slate-500 dark:text-slate-400'>
                      {formatRelativeTime(activity.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </section>
  );
}
