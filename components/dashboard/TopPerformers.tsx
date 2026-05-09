'use client';

import Link from 'next/link';
import { Medal, Music2, Sofa, Sparkles, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/shared/Skeletons';
import { useDashboardComposite } from '@/hooks/stats/useDashboardComposite';
import { formatCurrencyCLP, formatNumberCL } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/utils';

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
    description: 'Actividad por espacio',
    icon: Sofa,
    href: '/rooms',
    color: 'indigo'
  },
  {
    key: 'staff',
    title: 'Staff Destacado',
    description: 'Participación operativa',
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

  if (error || !data) return null;

  return (
    <div className='grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'>
      {rankingConfig.map(section => {
        const Icon = section.icon;
        const items = data.rankings[section.key];
        const colorClass =
          section.color === 'emerald'
            ? 'text-emerald-500 bg-emerald-500/10'
            : section.color === 'indigo'
              ? 'text-indigo-500 bg-indigo-500/10'
              : 'text-amber-500 bg-amber-500/10';

        return (
          <div key={section.key} className='flex flex-col gap-4'>
            <div className='flex items-center gap-3 px-1'>
              <div className={cn('p-2 rounded-xl', colorClass)}>
                <Icon className='h-4 w-4' />
              </div>
              <div className='flex flex-col'>
                <span className='text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white'>
                  {section.title}
                </span>
                <span className='text-[10px] font-bold text-slate-400 uppercase tracking-tighter'>
                  {section.description}
                </span>
              </div>
            </div>

            <div className='space-y-2'>
              {items.length === 0 ? (
                <div className='rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-4 text-center'>
                  <p className='text-[10px] font-black uppercase tracking-widest text-slate-400'>
                    Sin datos hoy
                  </p>
                </div>
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
