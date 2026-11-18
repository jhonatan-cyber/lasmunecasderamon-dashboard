'use client';

import { useState } from 'react';
import { AlertTriangle, ChevronDown, Clock3, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils/utils';
import type { PurchaseStockSummary } from './types';

function CodeList({ codigos }: { codigos: string[] }) {
  if (codigos.length === 0)
    return <span className='text-xs text-muted-foreground'>Sin códigos</span>;
  return (
    <div className='flex flex-wrap gap-1'>
      {codigos.map(codigo => (
        <code
          key={codigo}
          className='rounded-md border bg-background px-1.5 py-0.5 text-[11px] font-semibold'
        >
          {codigo}
        </code>
      ))}
    </div>
  );
}

export function StockSummaryPanel({ resumen }: { resumen?: PurchaseStockSummary }) {
  const [abierto, setAbierto] = useState(false);
  const data = resumen ?? {
    vencidas: { cantidad: 0, codigos: [] },
    por_vencer: { cantidad: 0, codigos: [] },
    buen_estado: { cantidad: 0, codigos: [] }
  };

  return (
    <div className='col-span-full rounded-lg border bg-muted/20'>
      <Collapsible open={abierto} onOpenChange={setAbierto}>
        <CollapsibleTrigger asChild>
          <Button
            type='button'
            variant='ghost'
            className='h-auto w-full justify-between gap-2 rounded-lg px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase hover:bg-transparent'
          >
            Estado actual en bodega
            <ChevronDown
              className={cn('size-4 shrink-0 transition-transform', abierto && 'rotate-180')}
              aria-hidden='true'
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className='grid gap-2 px-3 pt-1 pb-3 sm:grid-cols-3'>
            <div className='rounded-lg border border-red-200 bg-red-50 p-2 dark:border-red-900 dark:bg-red-950/30'>
              <div className='flex items-center justify-between gap-2'>
                <span className='flex items-center gap-1 text-xs font-semibold text-red-700 dark:text-red-300'>
                  <AlertTriangle className='h-3.5 w-3.5' /> Vencidos
                </span>
                <strong className='text-sm text-red-700 dark:text-red-300'>
                  {data.vencidas.cantidad}
                </strong>
              </div>
              <div className='mt-2'>
                <CodeList codigos={data.vencidas.codigos} />
              </div>
            </div>
            <div className='rounded-lg border border-amber-200 bg-amber-50 p-2 dark:border-amber-900 dark:bg-amber-950/30'>
              <div className='flex items-center justify-between gap-2'>
                <span className='flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300'>
                  <Clock3 className='h-3.5 w-3.5' /> Por vencer (30 días)
                </span>
                <strong className='text-sm text-amber-700 dark:text-amber-300'>
                  {data.por_vencer.cantidad}
                </strong>
              </div>
              <div className='mt-2'>
                <CodeList codigos={data.por_vencer.codigos} />
              </div>
            </div>
            <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-2 dark:border-emerald-900 dark:bg-emerald-950/30'>
              <div className='flex items-center justify-between gap-2'>
                <span className='flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300'>
                  <ShieldCheck className='h-3.5 w-3.5' /> Buen estado
                </span>
                <strong className='text-sm text-emerald-700 dark:text-emerald-300'>
                  {data.buen_estado.cantidad}
                </strong>
              </div>
              <div className='mt-2'>
                <CodeList codigos={data.buen_estado.codigos} />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
