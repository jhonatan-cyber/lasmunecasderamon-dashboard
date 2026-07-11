'use client';

import {
  Activity,
  DollarSign,
  LogIn,
  ShoppingCart,
  Sparkles,
  ChevronDown,
  Clock
} from 'lucide-react';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardComposite } from '@/hooks/stats/useDashboardComposite';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/utils';

const activityStyles = {
  venta: { icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  servicio: { icon: Sparkles, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  pedido: { icon: ShoppingCart, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  login: { icon: LogIn, color: 'text-sky-500', bg: 'bg-sky-500/10' },
  default: { icon: Activity, color: 'text-slate-500', bg: 'bg-slate-500/10' }
} as const;

function formatRelativeTime(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'ahora';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d`;
}

function ActivityLine({
  activity,
  isExpanded
}: {
  activity: {
    id: string;
    type: string;
    description: string;
    metadata?: string | null;
    amount: number | null;
    createdAt: string;
  };
  isExpanded: boolean;
}) {
  const style =
    activityStyles[activity.type as keyof typeof activityStyles] || activityStyles.default;
  const Icon = style.icon;

  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-xl p-2 transition-all duration-200',
        'hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent hover:border-slate-100 dark:hover:border-slate-800'
      )}
    >
      <div
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-110',
          style.bg
        )}
      >
        <Icon className={cn('h-4.5 w-4.5', style.color)} />
      </div>

      <div className='flex flex-1 flex-col min-w-0'>
        <div className='flex items-center justify-between gap-2'>
          <span className='truncate text-sm font-bold text-slate-800 dark:text-slate-200'>
            {activity.description}
          </span>
          <div className='flex items-center gap-1 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase'>
            <Clock className='h-3 w-3' />
            {formatRelativeTime(activity.createdAt)}
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <span className='text-[11px] font-medium text-slate-500 dark:text-slate-400'>
            {activity.type.toUpperCase()}
          </span>
          {(activity.metadata || activity.amount !== null) && (
            <>
              <div className='h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700' />
              <span className='truncate text-[11px] font-bold text-slate-600 dark:text-slate-400 italic'>
                {activity.metadata}
                {activity.amount !== null && (
                  <span className='ml-1 text-emerald-600 dark:text-emerald-400 not-italic font-black'>
                    ({formatCurrencyCLP(activity.amount)})
                  </span>
                )}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RecentActivityCompact() {
  const { data: composite, isLoading: loading, error } = useDashboardComposite();
  const [isExpanded, setIsExpanded] = useState(false);

  const activities = composite?.recentActivity || [];

  if (loading) {
    return (
      <div className='space-y-2'>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className='flex items-center gap-3 p-2'>
            <Skeleton className='h-9 w-9 rounded-xl' />
            <div className='flex-1 space-y-2'>
              <Skeleton className='h-4 w-3/4 rounded' />
              <Skeleton className='h-3 w-1/4 rounded' />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || activities.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-8 opacity-40'>
        <Activity className='h-8 w-8 text-slate-400 mb-2' />
        <p className='text-xs font-black uppercase tracking-widest text-slate-500'>
          Sin actividad reciente
        </p>
      </div>
    );
  }

  const MAX_ITEMS_COLLAPSED = 5;
  const displayItems = isExpanded ? activities : activities.slice(0, MAX_ITEMS_COLLAPSED);
  const hasMore = activities.length > MAX_ITEMS_COLLAPSED;

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex flex-col gap-1'>
        {displayItems.map(activity => (
          <ActivityLine key={activity.id} activity={activity} isExpanded={isExpanded} />
        ))}
      </div>

      {hasMore && (
        <button
          type='button'
          onClick={() => setIsExpanded(!isExpanded)}
          className='mt-2 flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-slate-50 dark:hover:bg-slate-900 dark:text-slate-400'
        >
          {isExpanded ? 'Mostrar menos' : `Ver todo (${activities.length})`}
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-300',
              isExpanded && 'rotate-180'
            )}
          />
        </button>
      )}
    </div>
  );
}
