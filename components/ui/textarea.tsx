import * as React from 'react';

import { cn } from '@/lib/utils/utils';
import { FIELD_INPUT_CLASS } from '@/lib/ui/fieldStyles';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(FIELD_INPUT_CLASS, 'flex min-h-[80px] h-auto', className, 'rounded-3xl')}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
