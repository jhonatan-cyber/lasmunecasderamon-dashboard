'use client';

import type { ComponentProps, ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/utils';

/** Formato visual; onChange entrega dígitos sin separadores para guardar el valor numérico. */
export function FormattedNumberInput({
  value,
  onChange,
  className,
  currency = false,
  ...props
}: ComponentProps<typeof Input> & { currency?: boolean }) {
  const formatted = String(value ?? '')
    .replace(/\D/g, '')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const input = (
    <Input
      {...props}
      type='text'
      inputMode='numeric'
      value={formatted}
      className={cn(className, currency && 'pl-7')}
      onChange={event => {
        const raw = event.target.value.replace(/\D/g, '');
        onChange?.({
          ...event,
          target: { ...event.target, name: event.target.name, value: raw },
          currentTarget: { ...event.currentTarget, value: raw }
        } as ChangeEvent<HTMLInputElement>);
      }}
    />
  );
  return currency ? (
    <div className='relative min-w-0'>
      <span
        aria-hidden='true'
        className='pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground'
      >
        $
      </span>
      {input}
    </div>
  ) : (
    input
  );
}
