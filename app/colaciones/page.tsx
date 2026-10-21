'use client';

import { useState } from 'react';
import { ReceiptText, Search, X } from 'lucide-react';
import { CajaStatusBanner } from '@/components/sales/CajaStatusBanner';
import { ColacionesTab } from '@/components/colaciones/ColacionesTab';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Módulo de colaciones. Reutiliza el mismo panel que la pestaña de colaciones
 * del módulo Bar para que el diseño, los catálogos por rol y la configuración
 * de ml/acompañamiento sean una sola fuente de verdad.
 */
export default function ColacionesPage() {
  const [search, setSearch] = useState('');

  return (
    <main className='mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8'>
      <CajaStatusBanner entityName='colaciones' />
      <header className='flex items-center gap-3'>
        <div className='rounded-xl border bg-card p-3 text-primary shadow-xs'>
          <ReceiptText className='h-6 w-6' />
        </div>
        <div>
          <h1 className='text-2xl font-bold tracking-tight sm:text-3xl'>Colaciones</h1>
          <p className='text-sm text-muted-foreground'>
            Registro de un corto por trabajador durante el turno de caja.
          </p>
        </div>
      </header>
      <div className='relative rounded-2xl border bg-card p-3'>
        <Search className='pointer-events-none absolute left-6 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder='Buscar trabajador o bebida'
          aria-label='Buscar colaciones'
          className='h-11 rounded-full pl-9 pr-12'
        />
        {search && (
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='absolute right-5 top-1/2 size-9 -translate-y-1/2 rounded-full'
            aria-label='Limpiar búsqueda de colaciones'
            onClick={() => setSearch('')}
          >
            <X />
          </Button>
        )}
      </div>
      <ColacionesTab searchTerm={search} />
    </main>
  );
}
