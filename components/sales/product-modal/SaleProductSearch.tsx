'use client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { Search, X } from 'lucide-react';

/** Búsqueda por nombre dentro de la categoría activa, con botón de limpiar. */
export function SaleProductSearch({
  value,
  onChange,
  onClear
}: {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className='relative min-w-0 flex-1'>
      <Search
        className='pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
        aria-hidden='true'
      />
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder='Buscar en esta categoría…'
        aria-label='Buscar producto en esta categoría'
        className='w-full rounded-full bg-background pl-11 pr-11 text-sm placeholder:text-muted-foreground'
      />
      {value && (
        <Button
          variant='ghost'
          size='icon'
          type='button'
          onClick={onClear}
          aria-label='Limpiar búsqueda'
          className='absolute right-1 top-1/2 size-9 -translate-y-1/2 rounded-full text-muted-foreground hover:text-foreground'
        >
          <X className='size-4' aria-hidden='true' />
        </Button>
      )}
    </div>
  );
}
