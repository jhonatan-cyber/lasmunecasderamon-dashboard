'use client';

import Link from 'next/link';
import { ArrowRight, DoorOpen, Receipt, TimerReset, Users, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/shared/Skeletons';
import { useDashboardComposite } from '@/hooks/stats/useDashboardComposite';

const itemsConfig = [
  {
    key: 'rooms',
    title: 'Habitaciones',
    icon: DoorOpen,
    href: '/rooms'
  },
  {
    key: 'services',
    title: 'Servicios',
    icon: TimerReset,
    href: '/private-rooms'
  },
  {
    key: 'orders',
    title: 'Pedidos',
    icon: Receipt,
    href: '/orders'
  },
  {
    key: 'team',
    title: 'Equipo',
    icon: Users,
    href: '/users'
  },
  {
    key: 'cash',
    title: 'Caja',
    icon: Wallet,
    href: '/cash-register'
  }
] as const;

export default function LocalStatusOverview() {
  const { data: composite, isLoading, error } = useDashboardComposite();
  const data = composite?.insights;

  if (isLoading) {
    return (
      <Card className='border-slate-200/80 dark:border-slate-800'>
        <CardHeader className='space-y-3'>
          <Skeleton className='h-6 w-56' />
          <Skeleton className='h-4 w-72' />
        </CardHeader>
        <CardContent className='grid gap-4 md:grid-cols-2 xl:grid-cols-5'>
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className='rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800'
            >
              <Skeleton className='mb-3 h-5 w-24' />
              <Skeleton className='mb-2 h-8 w-16' />
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

  const statusItems = [
    {
      key: 'rooms',
      title: 'Habitaciones',
      value: `${data.localStatus.rooms.occupied}/${data.localStatus.rooms.total}`,
      description: `${data.localStatus.rooms.free} libres y ${data.localStatus.rooms.occupancyRate}% de ocupación.`,
      badge: `${data.localStatus.rooms.occupancyRate}%`
    },
    {
      key: 'services',
      title: 'Servicios',
      value: String(data.localStatus.services.active),
      description: `${data.localStatus.services.expiringSoon} están por vencer pronto.`,
      badge: `${data.localStatus.services.expiringSoon} por vencer`
    },
    {
      key: 'orders',
      title: 'Pedidos',
      value: String(data.localStatus.orders.open),
      description: `${data.localStatus.orders.serviceRequests} solicitudes de servicio pendientes.`,
      badge: `${data.localStatus.orders.serviceRequests} solicitudes`
    },
    {
      key: 'team',
      title: 'Equipo',
      value: `${data.localStatus.team.active}/${data.localStatus.team.total}`,
      description: `${data.localStatus.team.coverageRate}% del personal activo en plataforma.`,
      badge: `${data.localStatus.team.coverageRate}% cobertura`
    },
    {
      key: 'cash',
      title: 'Caja',
      value: String(data.localStatus.cash.openRegisters),
      description:
        data.localStatus.cash.openRegisters > 0
          ? 'Hay caja abierta operando.'
          : 'No hay caja abierta actualmente.',
      badge: data.localStatus.cash.openRegisters > 0 ? 'Operativa' : 'Sin caja'
    }
  ];

  return (
    <section className='space-y-4'>
      <div>
        <h2 className='text-xl font-semibold text-slate-900 dark:text-slate-100'>
          Estado General Del Local
        </h2>
        <p className='mt-1 text-sm text-slate-600 dark:text-slate-400'>
          Una lectura rápida de capacidad, carga operativa, equipo y caja para no perder contexto
          del turno.
        </p>
      </div>

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-5'>
        {statusItems.map(item => {
          const config = itemsConfig.find(configItem => configItem.key === item.key);
          if (!config) return null;

          const Icon = config.icon;

          return (
            <Link
              key={item.key}
              href={config.href}
              className='group rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/30'
            >
              <div className='flex items-center justify-between gap-3'>
                <div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'>
                  <Icon className='h-5 w-5' />
                </div>
                <Badge className='rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200'>
                  {item.badge}
                </Badge>
              </div>

              <div className='mt-5'>
                <p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
                  {item.title}
                </p>
                <p className='mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white'>
                  {item.value}
                </p>
                <p className='mt-2 text-sm text-slate-600 dark:text-slate-400'>
                  {item.description}
                </p>
              </div>

              <div className='mt-4 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300'>
                Ver detalle
                <ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-0.5' />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
