import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/utils';

interface DashboardErrorProps {
  children: ReactNode;
  className?: string;
}

/** Aviso de error homogéneo para los bloques del dashboard. */
export function DashboardError({ children, className }: DashboardErrorProps) {
  return (
    <div
      role='alert'
      className={cn(
        'rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200',
        className
      )}
    >
      {children}
    </div>
  );
}

interface DashboardEmptyProps {
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}

/** Estado vacío homogéneo para los bloques del dashboard. */
export function DashboardEmpty({ icon: Icon, children, className }: DashboardEmptyProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-800 dark:bg-slate-950/10',
        className
      )}
    >
      {Icon && (
        <div className='mb-2 rounded-full bg-white p-2 shadow-xs dark:bg-slate-800'>
          <Icon aria-hidden='true' className='h-4 w-4 text-slate-300' />
        </div>
      )}
      <p className='text-[10px] font-black uppercase tracking-widest text-slate-400'>{children}</p>
    </div>
  );
}
