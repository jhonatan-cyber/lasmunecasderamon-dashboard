import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/utils';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';

interface DashboardErrorProps {
  children: ReactNode;
  className?: string;
}

/**
 * Aviso de error homogéneo para los bloques del dashboard.
 * Delega en el `ErrorState` compartido; solo ajusta el radio para la grilla del panel.
 */
export function DashboardError({ children, className }: DashboardErrorProps) {
  return (
    <ErrorState
      size='md'
      message={children}
      className={cn(
        'rounded-2xl border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200',
        className
      )}
    />
  );
}

interface DashboardEmptyProps {
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}

/** Estado vacío homogéneo para los bloques del dashboard (texto en mayúsculas). */
export function DashboardEmpty({ icon: Icon, children, className }: DashboardEmptyProps) {
  return (
    <EmptyState
      icon={Icon}
      title={
        <span className='text-[10px] font-black uppercase tracking-widest text-slate-400'>
          {children}
        </span>
      }
      className={cn('rounded-2xl', className)}
    />
  );
}
