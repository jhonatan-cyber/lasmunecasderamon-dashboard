import * as React from 'react';

import { cn } from '@/lib/utils/utils';
import { FIELD_INPUT_CLASS } from '@/lib/ui/fieldStyles';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          ['checkbox', 'radio', 'file', 'hidden', 'range', 'color'].includes(type || '')
            ? className
            : cn(
                FIELD_INPUT_CLASS,
                'flex file:border-0 file:bg-transparent file:text-sm file:font-medium',
                className,
                'rounded-full'
              )
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
