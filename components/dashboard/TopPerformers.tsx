'use client';

import Link from 'next/link';
import { Medal, Music2, Sofa, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardComposite } from '@/hooks/statistics/useDashboardComposite';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { DashboardError, DashboardEmpty } from '@/components/dashboard/DashboardFeedback';
import { PanelHeading } from '@/components/dashboard/DashboardHeading';

const rankingConfig = [
  {
    key: 'products',
    title: 'Productos Top',
    description: 'Ventas del día',
    icon: Sparkles,
    href: '/products',
    color: 'emerald'
  },
  {
    key: 'rooms',
    title: 'Salas Top',
    description: 'Actividad del día por espacio',
    icon: Sofa,
    href: '/rooms',
    color: 'indigo'
  },
  {
    key: 'staff',
    title: 'Staff Destacado',
    description: 'Participación del día · importes asociados',
    icon: Music2,
    href: '/users',
    color: 'amber'
  }
] as const;

export default function TopPerformers() {
  const { data: composite, isLoading, error } = useDashboardComposite();
  const data = composite?.insights;

  if (isLoading) {
    return (
      <div className='grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'>
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className='h-48 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/20 animate-pulse'
          />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return <DashboardError>No se pudieron cargar los rankings del dashboard.</DashboardError>;
  }

  return (
    <div className='grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'>
      {rankingConfig.map(section => {
        const items = data.rankings[section.key];

        return (
          <div key={section.key} className='flex flex-col gap-4'>
            <PanelHeading
              icon={section.icon}
              title={section.title}
              description={section.description}
              tone={section.color}
            />

            <div className='space-y-2'>
              {items.length === 0 ? (
                <DashboardEmpty className='border p-4'>Sin datos hoy</DashboardEmpty>
              ) : (
                items.map((item, index) => (
                  <Link
                    key={`${section.key}-${item.name}`}
                    href={section.href}
                    className='group flex items-center justify-between gap-3 rounded-2xl border border-slate-200/60 bg-white dark:border-slate-800/60 dark:bg-slate-950/20 p-3 transition-all hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-none'
                  >
                    <div className='flex items-center gap-3 min-w-0'>
                      <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800 text-[10px] font-black group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-slate-900 transition-all'>
                        {index === 0 ? <Medal className='h-3.5 w-3.5' /> : `#${index + 1}`}
                      </div>
                      <div className='flex flex-col truncate'>
                        <span className='text-xs font-bold text-slate-900 dark:text-slate-200 truncate'>
                          {item.name}
                        </span>
                        <span className='text-[10px] font-medium text-slate-500'>
                          {item.quantity} op.
                        </span>
                      </div>
                    </div>
                    <span className='text-xs font-black text-slate-900 dark:text-white whitespace-nowrap'>
                      {formatCurrencyCLP(item.amount)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
