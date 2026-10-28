import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: ReactNode;
  description?: ReactNode;
  /** Nodo opcional (por ejemplo un botón de limpiar filtros). */
  action?: ReactNode;
  /**
   * `panel` (por defecto) dibuja el contenedor punteado; `text` solo centra el
   * texto, pensado para usarse dentro de celdas de tabla o espacios ya
   * delimitados por su propia tarjeta.
   */
  variant?: 'panel' | 'text';
  className?: string;
}

const variantClasses = {
  panel:
    'rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-950/10',
  text: 'px-4 py-6'
};

const titleClasses = {
  panel: 'text-sm font-semibold text-slate-600 dark:text-slate-300',
  text: 'text-sm font-medium text-muted-foreground'
};

const descriptionClasses = {
  panel: 'mt-1 max-w-sm text-xs leading-relaxed text-slate-400 dark:text-slate-500',
  text: 'mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground/70'
};

/** Estado vacío reutilizable: ícono, título y descripción centrados. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = 'panel',
  className
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        variantClasses[variant],
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            'mb-3 rounded-full',
            variant === 'panel' && 'bg-white p-2 shadow-xs dark:bg-slate-800'
          )}
        >
          <Icon
            aria-hidden='true'
            className={cn(
              'h-5 w-5',
              variant === 'panel'
                ? 'text-slate-400 dark:text-slate-500'
                : 'mx-auto text-muted-foreground/60'
            )}
          />
        </div>
      )}
      {title && (
        <p aria-live='polite' className={titleClasses[variant]}>
          {title}
        </p>
      )}
      {description && <p className={descriptionClasses[variant]}>{description}</p>}
      {action && <div className='mt-4'>{action}</div>}
    </div>
  );
}
