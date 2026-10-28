'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/utils';

type ErrorStateSize = 'sm' | 'md' | 'lg';

interface ErrorStateProps {
  /** Texto o nodo con el detalle del error. */
  message: ReactNode;
  /** Encabezado opcional del aviso. */
  title?: ReactNode;
  /** Ícono inicial; pasa `icon={null}` para omitirlo. */
  icon?: LucideIcon | null;
  /** Si se provee, muestra un botón de reintento debajo del mensaje. */
  onRetry?: () => void;
  retryLabel?: string;
  /** Nodo alternativo al botón de reintento (acciones personalizadas). */
  action?: ReactNode;
  /** Variante de tamaño/densidad: `sm` para errores de formulario en línea. */
  size?: ErrorStateSize;
  className?: string;
}

const sizeClasses: Record<ErrorStateSize, string> = {
  sm: 'rounded-lg px-4 py-3 text-sm',
  md: 'rounded-2xl p-4 text-sm',
  lg: 'rounded-3xl p-5 text-sm'
};

/** Aviso de error reutilizable: panel `role="alert"`, mensaje y reintento opcional. */
export function ErrorState({
  message,
  title,
  icon: Icon,
  onRetry,
  retryLabel = 'Reintentar',
  action,
  size = 'md',
  className
}: ErrorStateProps) {
  return (
    <div
      role='alert'
      className={cn(
        'border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300',
        sizeClasses[size],
        className
      )}
    >
      <div className='flex items-start gap-2'>
        {Icon && <Icon aria-hidden='true' className='mt-0.5 h-4 w-4 shrink-0' />}
        <div className='min-w-0 flex-1'>
          {title && <p className='font-semibold'>{title}</p>}
          <div className={cn('min-w-0', title && 'mt-1')}>{message}</div>
        </div>
      </div>
      {(onRetry || action) && (
        <div className='mt-3'>
          {action ?? (
            <Button type='button' variant='outline' className='rounded-full' onClick={onRetry}>
              {retryLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
