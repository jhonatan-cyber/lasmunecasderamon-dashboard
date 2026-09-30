'use client';

import { LayoutGrid, List } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { SaleProductViewMode } from '@/hooks/shared/useSaleProductModal';

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
      className='justify-start gap-4'
    >
      <ToggleGroupItem
        value='table'
        aria-label='Ver como tabla'
        className='rounded-none px-1 text-muted-foreground hover:bg-transparent hover:text-foreground data-[state=on]:bg-transparent data-[state=on]:text-foreground data-[state=on]:underline data-[state=on]:decoration-2 data-[state=on]:underline-offset-[6px]'
      >
        <List className='size-4' aria-hidden='true' />
        Tabla
      </ToggleGroupItem>
      <ToggleGroupItem
        value='cards'
        aria-label='Ver como tarjetas'
        className='rounded-none px-1 text-muted-foreground hover:bg-transparent hover:text-foreground data-[state=on]:bg-transparent data-[state=on]:text-foreground data-[state=on]:underline data-[state=on]:decoration-2 data-[state=on]:underline-offset-[6px]'
      >
        <LayoutGrid className='size-4' aria-hidden='true' />
        Tarjetas
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
