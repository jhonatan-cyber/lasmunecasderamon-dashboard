import { Button } from '@/components/ui/button';
import React from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';

interface ActionButtonWithTooltipProps {
  onClick: () => void;
  children: React.ReactNode;
  tooltip: string;
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
}

export function ActionButtonWithTooltip({
  onClick,
  children,
  tooltip,
  className,
  type = 'button',
  disabled
}: ActionButtonWithTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant='unstyled'
          type={type}
          className={className}
          onClick={onClick}
          disabled={disabled}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
