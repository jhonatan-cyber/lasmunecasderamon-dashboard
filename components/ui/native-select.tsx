import * as React from 'react';
import { cn } from '@/lib/utils/utils';
import { FIELD_INPUT_CLASS } from '@/lib/ui/fieldStyles';

/** Native selection when browser keyboard interaction and option semantics are needed. */
export const NativeSelect = React.forwardRef<HTMLSelectElement, React.ComponentProps<'select'>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(FIELD_INPUT_CLASS, 'cursor-pointer', className, 'rounded-full')}
      {...props}
    />
  )
);
NativeSelect.displayName = 'NativeSelect';
