'use client';

import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

export function ServicioIconAction({
  label,
  children,
  className = '',
  ...props
}: ComponentProps<typeof Button> & { label: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type='button'
            variant='outline'
            size='icon'
            aria-label={label}
            className={`h-9 w-9 shrink-0 rounded-full ${className}`}
            {...props}
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent>{label}</TooltipContent>
        </TooltipPortal>
      </Tooltip>
    </TooltipProvider>
  );
}
