'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ChevronRight,
  Clock3,
  DoorClosed,
  Receipt,
  Wallet
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/shared/Skeletons';
import { useDashboardAlerts } from '@/hooks/stats/useDashboardAlerts';
import { cn } from '@/lib/utils/utils';

const severityStyles = {
  critical: {
    card: 'border-rose-200 bg-rose-50/80 dark:border-rose-900/70 dark:bg-rose-950/30',
    icon: 'text-rose-600 dark:text-rose-300',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-200',
    label: 'Crítica'
  },
  warning: {
    card: 'border-amber-200 bg-amber-50/80 dark:border-amber-900/70 dark:bg-amber-950/30',
    icon: 'text-amber-600 dark:text-amber-300',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200',
    label: 'Atención'
  },
  success: {
    card: 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/70 dark:bg-emerald-950/30',
    icon: 'text-emerald-600 dark:text-emerald-300',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200',
    label: 'OK'
  }
} as const;

const alertIcons = {
  'cash-register': Wallet,
  orders: Receipt,
  'service-requests': BellRing,
  timers: Clock3
} as const;

export default function OperationalAlerts() {
  const { data, isLoading, error, refetch } = useDashboardAlerts();

  if (isLoading) {
    return (
      <Card className='border-slate-200/80 dark:border-slate-800'>
        <CardHeader className='space-y-3'>
          <Skeleton className='h-6 w-48' />
          <Skeleton className='h-4 w-72' />
        </CardHeader>
        <CardContent className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className='rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800'
            >
              <Skeleton className='mb-3 h-4 w-24' />
              <Skeleton className='mb-4 h-8 w-14' />
              <Skeleton className='h-3 w-full' />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className='border-rose-200 bg-rose-50/60 dark:border-rose-900/60 dark:bg-rose-950/30'>
        <CardContent className='flex flex-col gap-3 p-5 text-sm text-rose-700 dark:text-rose-200 md:flex-row md:items-center md:justify-between'>
          <div>
            <p className='font-semibold'>No se pudieron cargar las alertas operativas.</p>
            <p className='text-rose-600/80 dark:text-rose-200/80'>
              Reintenta para recuperar el estado del dashboard.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className='w-fit rounded-xl bg-rose-600 px-3 py-2 text-white transition hover:bg-rose-700'
          >
            Reintentar
          </button>
        </CardContent>
      </Card>
    );
  }

  const hasOperationalPressure = data.summary.criticalCount > 0 || data.summary.warningCount > 0;

  return (
    <Card className='overflow-hidden border-slate-200/80 dark:border-slate-800'>
      <CardHeader className='border-b border-slate-200/80 bg-gradient-to-r from-slate-50 to-white dark:border-slate-800 dark:from-slate-950 dark:to-slate-900'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
          <div>
            <CardTitle className='flex items-center gap-2 text-xl'>
              <AlertTriangle className='h-5 w-5 text-amber-500' />
              Alertas Operativas
            </CardTitle>
            <p className='mt-1 text-sm text-slate-600 dark:text-slate-400'>
              Prioridades inmediatas para supervisar el turno y resolver cuellos de botella.
            </p>
          </div>

          <div className='flex flex-wrap gap-2'>
            <Badge className='rounded-full bg-slate-900 px-3 py-1 text-white dark:bg-slate-100 dark:text-slate-900'>
              {data.summary.occupiedRooms} habitaciones ocupadas
            </Badge>
            <Badge className='rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200'>
              {data.summary.freeRooms} libres de {data.summary.totalRooms}
            </Badge>
            <Badge
              className={cn(
                'rounded-full px-3 py-1',
                hasOperationalPressure
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200'
              )}
            >
              {hasOperationalPressure
                ? `${data.summary.criticalCount + data.summary.warningCount} focos activos`
                : 'Operación estable'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className='grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4'>
        {data.alerts.map(alert => {
          const Icon =
            alert.id in alertIcons
              ? alertIcons[alert.id as keyof typeof alertIcons]
              : AlertTriangle;
          const severity = severityStyles[alert.severity];

          return (
            <Link
              key={alert.id}
              href={alert.href}
              className={cn(
                'group rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
                severity.card
              )}
            >
              <div className='flex items-start justify-between gap-3'>
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 shadow-sm dark:bg-black/10',
                    severity.icon
                  )}
                >
                  <Icon className='h-5 w-5' />
                </div>
                <Badge className={cn('rounded-full px-2.5 py-1 text-[11px]', severity.badge)}>
                  {severity.label}
                </Badge>
              </div>

              <div className='mt-4 space-y-2'>
                <p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
                  {alert.title}
                </p>
                <div className='flex items-end gap-2'>
                  <span className='text-3xl font-bold tracking-tight text-slate-950 dark:text-white'>
                    {alert.value}
                  </span>
                  {alert.value === 0 && (
                    <CheckCircle2 className='mb-1 h-4 w-4 text-emerald-500 dark:text-emerald-300' />
                  )}
                </div>
                <p className='min-h-[40px] text-sm text-slate-600 dark:text-slate-400'>
                  {alert.description}
                </p>
              </div>

              <div className='mt-4 flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300'>
                <span>{alert.ctaLabel}</span>
                <ChevronRight className='h-4 w-4 transition-transform group-hover:translate-x-0.5' />
              </div>
            </Link>
          );
        })}

        {data.summary.occupiedRooms === 0 && (
          <div className='rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/40'>
            <div className='flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-800'>
              <DoorClosed className='h-5 w-5 text-slate-500' />
            </div>
            <p className='mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100'>
              Habitaciones libres
            </p>
            <p className='mt-2 text-sm text-slate-600 dark:text-slate-400'>
              En este momento hay {data.summary.freeRooms} habitaciones disponibles de un total de{' '}
              {data.summary.totalRooms}. Buen momento para preparar nuevas atenciones.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
