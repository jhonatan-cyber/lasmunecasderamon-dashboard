'use client';

import Link from 'next/link';
import { ArrowRight, BellRing, ClipboardList, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/shared/Skeletons';
import { useDashboardPendingItems } from '@/hooks/stats/useDashboardPendingItems';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { formatShortTimeEs } from '@/lib/utils/calendarUtils';

function PendingSection({
  title,
  description,
  icon: Icon,
  items,
  emptyLabel
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  items: Array<{
    id: string;
    code: string;
    title: string;
    subtitle: string;
    amount: number;
    createdAt: string;
    href: string;
  }>;
  emptyLabel: string;
}) {
  return (
    <Card className='border-slate-200/80 dark:border-slate-800'>
      <CardHeader className='border-b border-slate-200/70 dark:border-slate-800'>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <CardTitle className='flex items-center gap-2 text-lg'>
              <Icon className='h-5 w-5 text-amber-500' />
              {title}
            </CardTitle>
            <p className='mt-1 text-sm text-slate-600 dark:text-slate-400'>{description}</p>
          </div>
          <Badge className='rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200'>
            {items.length}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className='space-y-3 p-4'>
        {items.length === 0 ? (
          <div className='rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400'>
            {emptyLabel}
          </div>
        ) : (
          items.map(item => (
            <Link
              key={item.id}
              href={item.href}
              className='group block rounded-2xl border border-slate-200/80 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950/30'
            >
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
                    {item.code}
                  </p>
                  <p className='mt-1 text-sm text-slate-700 dark:text-slate-300'>{item.title}</p>
                  <p className='mt-1 text-xs text-slate-500 dark:text-slate-400'>{item.subtitle}</p>
                </div>
                <ArrowRight className='h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5' />
              </div>

              <div className='mt-4 flex items-center justify-between gap-3'>
                <div className='text-sm font-medium text-slate-900 dark:text-slate-100'>
                  {formatCurrencyCLP(item.amount)}
                </div>
                <div className='text-xs text-slate-500 dark:text-slate-400'>
                  {formatShortTimeEs(item.createdAt)}
                </div>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function ActionablePending() {
  const { data, isLoading, error } = useDashboardPendingItems();
  const { user } = useCurrentUser();
  const { hasPermission } = useUserPermissions();

  const isAdmin = user?.role?.toLowerCase() === 'administrador';
  const canViewOrders = isAdmin || hasPermission('orders', 'view');
  const canProcessOrders = isAdmin || hasPermission('orders', 'process');

  if (!canViewOrders) {
    return null;
  }

  if (isLoading) {
    return (
      <div className='grid gap-6 lg:grid-cols-2'>
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index} className='border-slate-200/80 dark:border-slate-800'>
            <CardHeader className='space-y-3'>
              <Skeleton className='h-6 w-40' />
              <Skeleton className='h-4 w-64' />
            </CardHeader>
            <CardContent className='space-y-3'>
              {Array.from({ length: 3 }).map((__, innerIndex) => (
                <div
                  key={innerIndex}
                  className='rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800'
                >
                  <Skeleton className='mb-2 h-4 w-24' />
                  <Skeleton className='mb-2 h-4 w-40' />
                  <Skeleton className='h-3 w-24' />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className='border-rose-200 bg-rose-50/60 dark:border-rose-900/60 dark:bg-rose-950/30'>
        <CardContent className='p-5 text-sm text-rose-700 dark:text-rose-200'>
          No se pudieron cargar los pendientes accionables del dashboard.
        </CardContent>
      </Card>
    );
  }

  return (
    <section className='space-y-4'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h2 className='text-xl font-semibold text-slate-900 dark:text-slate-100'>
            Pendientes accionables
          </h2>
          <p className='mt-1 text-sm text-slate-600 dark:text-slate-400'>
            Listado resumido de pendientes para entrar directo al módulo correcto y resolverlos.
          </p>
        </div>
        <Badge className='w-fit rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200'>
          {data.summary.totalVisibleItems} visibles
        </Badge>
      </div>

      <div className='grid gap-6 lg:grid-cols-2'>
        <PendingSection
          title='Pedidos por atender'
          description='Pedidos pendientes que requieren revisión o procesamiento.'
          icon={Receipt}
          items={data.orders}
          emptyLabel='No hay pedidos pendientes en este momento.'
        />

        {canProcessOrders ? (
          <PendingSection
            title='Solicitudes de servicio'
            description='Solicitudes pendientes listas para aprobar o rechazar.'
            icon={BellRing}
            items={data.serviceRequests}
            emptyLabel='No hay solicitudes de servicio pendientes.'
          />
        ) : (
          <Card className='border-slate-200/80 dark:border-slate-800'>
            <CardHeader className='border-b border-slate-200/70 dark:border-slate-800'>
              <CardTitle className='flex items-center gap-2 text-lg'>
                <ClipboardList className='h-5 w-5 text-slate-500' />
                Solicitudes de servicio
              </CardTitle>
            </CardHeader>
            <CardContent className='p-4 text-sm text-slate-600 dark:text-slate-400'>
              Tu rol puede visualizar pedidos, pero no procesar solicitudes de servicio desde este
              dashboard.
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
