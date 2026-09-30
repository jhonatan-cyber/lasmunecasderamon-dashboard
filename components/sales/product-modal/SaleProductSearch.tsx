'use client';

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
    <div className='mb-3 flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 transition-colors focus-within:border-neutral-400 dark:border-white/10 dark:bg-white/5 dark:focus-within:border-white/30'>
      <Search className='size-4 shrink-0 text-muted-foreground' aria-hidden='true' />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder='Buscar en esta categoría…'
        aria-label='Buscar producto en esta categoría'
        className='w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground'
      />
      {value && (
        <button
          type='button'
          onClick={onClear}
          aria-label='Limpiar búsqueda'
          className='rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground'
        >
          <X className='size-4' aria-hidden='true' />
        </button>
      )}
    </div>
  );
}
