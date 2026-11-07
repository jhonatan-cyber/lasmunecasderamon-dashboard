'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function SaleProductCollapseButton({
  productName,
  collapsed,
  onClick
}: {
  productName: string;
  collapsed: boolean;
  onClick: () => void;
}) {
  const label = `${collapsed ? 'Mostrar' : 'Ocultar'} detalles de ${productName}`;
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='shrink-0'
            aria-expanded={!collapsed}
            aria-label={label}
            onClick={onClick}
          >
            {collapsed ? (
              <ChevronDown className='size-4' aria-hidden='true' />
            ) : (
              <ChevronUp className='size-4' aria-hidden='true' />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{collapsed ? 'Mostrar detalles' : 'Ocultar detalles'}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
