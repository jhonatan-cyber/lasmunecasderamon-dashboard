import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils/utils';
import { Skeleton } from '@/components/ui/skeleton';

const tones = {
  violet: 'border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-200',
  rose: 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-200',
  emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  amber: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-200',
  blue: 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-200',
  red: 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-200',
  purple: 'border-purple-500/20 bg-purple-500/10 text-purple-700 dark:text-purple-200',
  indigo: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-200',
  orange: 'border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-200',
  pink: 'border-pink-500/20 bg-pink-500/10 text-pink-700 dark:text-pink-200',
  cyan: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200',
  slate: 'border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-200'
};

interface MetricCardProps {
  icon: ReactNode;
  badge?: ReactNode;
  label: ReactNode;
  value: ReactNode;
  footer?: ReactNode;
  tone?: keyof typeof tones;
  className?: string;
  isLoading?: boolean;
}

/** Summary card used across modules; callers provide data and domain-specific details. */
export function MetricCard({
  icon,
  badge,
  label,
  value,
  footer,
  tone = 'slate',
  className,
  isLoading
}: MetricCardProps) {
  return (
    <Card
      className={cn(
        'group overflow-hidden rounded-3xl border shadow-xs backdrop-blur-xs transition-transform duration-300 hover:scale-[1.02]',
        tones[tone],
        className
      )}
    >
      <CardContent className='p-5'>
        <div className='mb-4 flex items-center justify-between gap-2'>
          <div className='rounded-2xl bg-current/10 p-2.5 [&_svg]:h-4 [&_svg]:w-4'>{icon}</div>
          {badge && (
            <span className='rounded-full bg-current/10 px-2 py-1 text-center text-[8px] font-black uppercase tracking-[0.2em]'>
              {badge}
            </span>
          )}
        </div>
        <div className='space-y-0.5'>
          <p className='text-[10px] font-bold uppercase tracking-widest opacity-70'>{label}</p>
          {isLoading ? (
            <Skeleton className='h-7 w-24' />
          ) : (
            <h3 className='text-xl font-black'>{value}</h3>
          )}
          {footer}
        </div>
      </CardContent>
    </Card>
  );
}
