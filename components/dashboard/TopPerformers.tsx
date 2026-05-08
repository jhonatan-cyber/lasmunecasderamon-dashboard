'use client';

import Link from 'next/link';
import { Medal, Music2, Sofa, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/shared/Skeletons';
import { useDashboardInsights } from '@/hooks/stats/useDashboardInsights';
import { formatCurrencyCLP, formatNumberCL } from '@/lib/utils/formatters';

const rankingConfig = [
  {
    key: 'products',
    title: 'Productos top',
    description: 'Qué está empujando la venta del día.',
    icon: Sparkles,
    href: '/products'
  },
  {
    key: 'rooms',
    title: 'Habitaciones top',
    description: 'Dónde se concentra hoy la actividad.',
    icon: Sofa,
    href: '/rooms'
  },
  {
    key: 'staff',
    title: 'Equipo destacado',
    description: 'Quién está participando más en operación.',
    icon: Music2,
    href: '/users'
  }
] as const;

export default function TopPerformers() {
  const { data, isLoading, error } = useDashboardInsights();

  if (isLoading) {
    return (
      <div className='grid gap-6 xl:grid-cols-3'>
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className='border-slate-200/80 dark:border-slate-800'>
            <CardHeader className='space-y-3'>
              <Skeleton className='h-6 w-36' />
              <Skeleton className='h-4 w-48' />
            </CardHeader>
            <CardContent className='space-y-3'>
              {Array.from({ length: 4 }).map((__, rowIndex) => (
                <div
                  key={rowIndex}
                  className='rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800'
                >
                  <Skeleton className='mb-2 h-4 w-32' />
                  <Skeleton className='h-3 w-full' />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  return (
    <section className='space-y-4'>
      <div>
        <h2 className='text-xl font-semibold text-slate-900 dark:text-slate-100'>
          Rankings Y Top Performers
        </h2>
        <p className='mt-1 text-sm text-slate-600 dark:text-slate-400'>
          Resumen rápido de los mejores movimientos del día para detectar foco comercial y
          operativo.
        </p>
      </div>

      <div className='grid gap-6 xl:grid-cols-3'>
        {rankingConfig.map(section => {
          const Icon = section.icon;
          const items = data.rankings[section.key];

          return (
            <Card key={section.key} className='border-slate-200/80 dark:border-slate-800'>
              <CardHeader className='border-b border-slate-200/70 pb-4 dark:border-slate-800'>
                <div className='flex items-start gap-3'>
                  <div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'>
                    <Icon className='h-5 w-5' />
                  </div>
                  <div>
                    <CardTitle className='text-lg'>{section.title}</CardTitle>
                    <p className='mt-1 text-sm text-slate-600 dark:text-slate-400'>
                      {section.description}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className='space-y-3 p-4'>
                {items.length === 0 ? (
                  <div className='rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400'>
                    Todavía no hay datos suficientes para este ranking hoy.
                  </div>
                ) : (
                  items.map((item, index) => (
                    <Link
                      key={`${section.key}-${item.name}`}
                      href={section.href}
                      className='flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950/30'
                    >
                      <div className='flex items-center gap-3'>
                        <div className='flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'>
                          {index === 0 ? (
                            <Medal className='h-4 w-4' />
                          ) : (
                            <span className='text-sm font-bold'>#{index + 1}</span>
                          )}
                        </div>
                        <div>
                          <p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
                            {item.name}
                          </p>
                          <p className='text-sm text-slate-600 dark:text-slate-400'>
                            {formatNumberCL(item.quantity)} movimientos
                          </p>
                        </div>
                      </div>
                      <p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
                        {formatCurrencyCLP(item.amount)}
                      </p>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
