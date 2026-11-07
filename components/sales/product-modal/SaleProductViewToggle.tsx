'use client';

import { LayoutGrid, List } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { SaleProductViewMode } from '@/hooks/sales/useSaleProductModal';

/** Conmutador Tabla/Tarjetas del encabezado del modal. */
export function SaleProductViewToggle({
  viewMode,
  onValueChange
}: {
  viewMode: SaleProductViewMode;
  onValueChange: (mode: SaleProductViewMode) => void;
}) {
  return (
    <ToggleGroup
      type='single'
      value={viewMode}
      onValueChange={value => {
        if (value === 'table' || value === 'cards') onValueChange(value);
      }}
      variant='default'
      size='sm'
      aria-label='Vista de productos'
      className='shrink-0 justify-start gap-2'
    >
      <ToggleGroupItem
        value='table'
        aria-label='Ver como tabla'
        className='h-10 rounded-full border border-input bg-background px-4 text-foreground transition-all duration-200 hover:scale-105 hover:bg-accent data-[state=on]:border-black data-[state=on]:bg-black data-[state=on]:text-white data-[state=on]:hover:bg-black/80 dark:data-[state=on]:border-white dark:data-[state=on]:bg-white dark:data-[state=on]:text-black dark:data-[state=on]:hover:bg-white/90'
      >
        <List className='size-4' aria-hidden='true' />
        Tabla
      </ToggleGroupItem>
      <ToggleGroupItem
        value='cards'
        aria-label='Ver como tarjetas'
        className='h-10 rounded-full border border-input bg-background px-4 text-foreground transition-all duration-200 hover:scale-105 hover:bg-accent data-[state=on]:border-black data-[state=on]:bg-black data-[state=on]:text-white data-[state=on]:hover:bg-black/80 dark:data-[state=on]:border-white dark:data-[state=on]:bg-white dark:data-[state=on]:text-black dark:data-[state=on]:hover:bg-white/90'
      >
        <LayoutGrid className='size-4' aria-hidden='true' />
        Tarjetas
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
