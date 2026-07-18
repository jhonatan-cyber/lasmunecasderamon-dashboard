'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Banknote,
  CreditCard,
  DollarSign,
  Receipt,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  Wallet
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { type DashboardTrend, useDashboardComposite } from '@/hooks/stats/useDashboardComposite';
import { cn } from '@/lib/utils/utils';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

type KPIItem = {
  label: string;
  value: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'blue' | 'amber' | 'emerald';
  trend?: DashboardTrend;
  contextBadge?: string;
};

const toneStyles = {
  blue: {
    iconWrap: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200'
  },
  amber: {
    iconWrap: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200'
  },
  emerald: {
    iconWrap: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200'
  }
} as const;

function TrendBadge({ trend }: { trend?: DashboardTrend }) {
  if (!trend) return null;

  const isUp = trend.direction === 'up';
  const isDown = trend.direction === 'down';
  const Icon = isDown ? TrendingDown : TrendingUp;
  const badgeClass = isUp
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200'
    : isDown
      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200'
      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';

  if (trend.direction === 'flat') {
    return (
      <Badge className={cn('rounded-full px-2.5 py-1 text-[11px]', badgeClass)}>
        Sin variación
      </Badge>
    );
  }

  return (
    <Badge className={cn('rounded-full px-2.5 py-1 text-[11px]', badgeClass)}>
      <Icon className='mr-1 h-3 w-3' />
      {Math.abs(trend.percentChange)}% vs ayer
    </Badge>
  );
}

function KPIGroup({
  title,
  description,
  badge,
  items
}: {
  title: string;
  description: string;
  badge: string;
  items: KPIItem[];
}) {
  return (
    <Card className='border-slate-200/80 dark:border-slate-800'>
      <CardHeader className='border-b border-slate-200/70 pb-4 dark:border-slate-800'>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <CardTitle className='text-lg'>{title}</CardTitle>
            <p className='mt-1 text-sm text-slate-600 dark:text-slate-400'>{description}</p>
          </div>
          <Badge className='rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200'>
            {badge}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className='grid gap-3 p-4'>
        {items.map(item => {
          const Icon = item.icon;
          const tone = toneStyles[item.tone];

          return (
            <Link
              key={item.label}
              href={item.href}
              className='group rounded-2xl border border-slate-200/80 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs dark:border-slate-800 dark:bg-slate-950/30'
            >
              <div className='flex items-start justify-between gap-3'>
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-2xl',
                    tone.iconWrap
                  )}
                >
                  <Icon className='h-5 w-5' />
                </div>
                <ArrowRight className='h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5' />
              </div>

              <div className='mt-4'>
                <div className='flex flex-wrap items-center gap-2'>
                  <p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
                    {item.label}
                  </p>
                  <TrendBadge trend={item.trend} />
                  {item.contextBadge ? (
                    <Badge className={cn('rounded-full px-2.5 py-1 text-[11px]', tone.badge)}>
                      {item.contextBadge}
                    </Badge>
                  ) : null}
                </div>
                <div className='mt-1 flex items-end gap-2'>
                  <span className='text-3xl font-bold tracking-tight text-slate-950 dark:text-white'>
                    {item.value}
                  </span>
                </div>
                <p className='mt-2 text-sm text-slate-600 dark:text-slate-400'>
                  {item.description}
                </p>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function DashboardKPIOverview() {
  const { data: composite, isLoading: loading, error: compositeError } = useDashboardComposite();

  const businessStats = composite?.cajaStats;
  const loggedUsers = composite?.loggedUsers;
  const insights = composite?.insights;

  if (loading) {
    return (
      <div className='grid gap-6 xl:grid-cols-3'>
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className='border-slate-200/80 dark:border-slate-800'>
            <CardHeader className='space-y-3'>
              <Skeleton className='h-6 w-36' />
              <Skeleton className='h-4 w-52' />
            </CardHeader>
            <CardContent className='space-y-3'>
              {Array.from({ length: 3 }).map((__, innerIndex) => (
                <div
                  key={innerIndex}
                  className='rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800'
                >
                  <Skeleton className='mb-3 h-4 w-24' />
                  <Skeleton className='mb-2 h-8 w-20' />
                  <Skeleton className='h-3 w-full' />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (compositeError || !businessStats || !loggedUsers || !insights) {
    return (
      <Card className='border-rose-200 bg-rose-50/60 dark:border-rose-900/60 dark:bg-rose-950/30'>
        <CardContent className='p-5 text-sm text-rose-700 dark:text-rose-200'>
          No se pudieron cargar los KPIs ejecutivos del dashboard.
        </CardContent>
      </Card>
    );
  }

  const totalLoggedUsers =
    loggedUsers.anfitrionas.logueadas +
    loggedUsers.garzones.logueadas +
    loggedUsers.cajeros.logueadas;

  const totalPaymentFlows =
    Number(businessStats.total_efectivo || 0) +
    Number(businessStats.total_tarjeta || 0) +
    Number(businessStats.total_transferencia || 0);

  const businessItems: KPIItem[] = [
    {
      label: 'Ventas del turno',
      value: formatCurrencyCLP(businessStats.total_ventas),
      description: `${businessStats.cantidad_ventas} ventas registradas en la caja activa.`,
      href: '/sales',
      icon: TrendingUp,
      tone: 'blue',
      trend: insights.comparisons.salesToday,
      contextBadge: `${Math.abs(insights.comparisons.salesWeek.percentChange)}% vs semana previa`
    },
    {
      label: 'Servicios del turno',
      value: formatCurrencyCLP(businessStats.total_servicios),
      description: `${businessStats.cantidad_servicios} servicios procesados en el turno.`,
      href: '/private-rooms',
      icon: Receipt,
      tone: 'emerald',
      trend: insights.comparisons.servicesToday,
      contextBadge: `${insights.localStatus.services.active} activos ahora`
    },
    {
      label: 'Movimiento total',
      value: formatCurrencyCLP(totalPaymentFlows),
      description: 'Suma de efectivo, tarjeta y transferencias acumuladas.',
      href: '/cash-register',
      icon: DollarSign,
      tone: 'amber',
      trend: insights.comparisons.movementToday,
      contextBadge: `${insights.comparisons.operationsWeek.current} ventas esta semana`
    }
  ];

  const cashItems: KPIItem[] = [
    {
      label: 'Efectivo en caja',
      value: formatCurrencyCLP(businessStats.efectivo_en_caja),
      description: 'Disponible actual considerando apertura y efectivo ingresado.',
      href: '/cash-register',
      icon: Wallet,
      tone: 'amber',
      contextBadge: `Apertura ${formatCurrencyCLP(businessStats.monto_apertura)}`
    },
    {
      label: 'Ingresos por tarjeta',
      value: formatCurrencyCLP(businessStats.total_tarjeta),
      description: 'Cobros acumulados en tarjetas durante el turno.',
      href: '/cash-register',
      icon: CreditCard,
      tone: 'blue',
      trend: insights.comparisons.salesToday
    },
    {
      label: 'Balance del turno',
      value: formatCurrencyCLP(businessStats.balance_total),
      description: 'Balance consolidado de la caja abierta actual.',
      href: '/cash-register',
      icon: Banknote,
      tone: 'emerald',
      trend: insights.comparisons.movementToday,
      contextBadge: businessStats.caja_id ? 'Caja activa' : 'Sin caja'
    }
  ];

  const peopleItems: KPIItem[] = [
    {
      label: 'Anfitrionas activas',
      value: String(loggedUsers.anfitrionas.logueadas),
      description: `${loggedUsers.anfitrionas.porcentaje}% del equipo disponible.`,
      href: '/users',
      icon: Users,
      tone: 'emerald',
      contextBadge: `${loggedUsers.anfitrionas.total} registradas`
    },
    {
      label: 'Garzones activos',
      value: String(loggedUsers.garzones.logueadas),
      description: `${loggedUsers.garzones.porcentaje}% del equipo disponible.`,
      href: '/users',
      icon: UserCheck,
      tone: 'blue',
      contextBadge: `${loggedUsers.garzones.total} registrados`
    },
    {
      label: 'Cajeros activos',
      value: String(loggedUsers.cajeros.logueadas),
      description: `${loggedUsers.cajeros.porcentaje}% del equipo disponible.`,
      href: '/users',
      icon: ShieldCheck,
      tone: 'emerald',
      contextBadge: `${loggedUsers.cajeros.total} registrados`
    }
  ];

  return (
    <section className='space-y-4'>
      <div>
        <h2 className='text-xl font-semibold text-slate-900 dark:text-slate-100'>
          KPIs Reorganizados
        </h2>
        <p className='mt-1 text-sm text-slate-600 dark:text-slate-400'>
          Panorama ejecutivo del turno con contexto comparativo para leer rendimiento, caja y equipo
          sin duplicar urgencias operativas.
        </p>
      </div>

      <div className='grid gap-6 xl:grid-cols-3'>
        <KPIGroup
          title='Rendimiento'
          description='Cómo se está moviendo el turno en ventas y servicios.'
          badge={`${businessStats.cantidad_ventas + businessStats.cantidad_servicios} operaciones`}
          items={businessItems}
        />
        <KPIGroup
          title='Caja'
          description='Lectura financiera rápida del turno actual.'
          badge={businessStats.caja_id ? 'Caja activa' : 'Sin caja'}
          items={cashItems}
        />
        <KPIGroup
          title='Personal'
          description='Disponibilidad y presencia del equipo en plataforma.'
          badge={`${totalLoggedUsers} activos`}
          items={peopleItems}
        />
      </div>
    </section>
  );
}
