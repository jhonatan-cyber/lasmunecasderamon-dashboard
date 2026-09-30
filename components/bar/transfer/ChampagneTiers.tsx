'use client';

import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { formatMiles, type ChampagneTierRow } from '@/components/bar/transfer/transferOptions';

const ColumnHeaders = () => (
  <>
    <span className='text-[10px] font-bold uppercase tracking-wider text-gray-400'>N°</span>
    <span className='text-[10px] font-bold uppercase tracking-wider text-gray-400'>Precio</span>
    <span className='text-[10px] font-bold uppercase tracking-wider text-gray-400'>Comisión</span>
  </>
);

/** Tabla champagne de solo lectura (bloque «Configuración guardada»). */
export const ChampagneTiersReadonly = memo(function ChampagneTiersReadonly({
  tiers
}: {
  tiers: ChampagneTierRow[];
}) {
  return (
    <div className='grid grid-cols-[2.5rem_1fr_1fr] items-center gap-2 pt-1 text-sm'>
      <ColumnHeaders />
      {tiers.flatMap(t => [
        <span
          key={`n-${t.anfitrionas}`}
          className='inline-flex h-9 items-center justify-center rounded-xl bg-purple-100 font-bold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
        >
          {t.anfitrionas}
        </span>,
        <span key={`p-${t.anfitrionas}`} className='font-semibold tabular-nums'>
          ${t.precio}
        </span>,
        <span key={`c-${t.anfitrionas}`} className='text-muted-foreground tabular-nums'>
          ${t.comision}
        </span>
      ])}
    </div>
  );
});

/** Tabla champagne editable (modo «editar precios»). */
export const ChampagneTiersEditor = memo(function ChampagneTiersEditor({
  tiers,
  saving,
  onTierChange
}: {
  tiers: ChampagneTierRow[];
  saving: boolean;
  onTierChange: (index: number, field: 'precio' | 'comision', value: string) => void;
}) {
  return (
    <div className='space-y-2 rounded-xl border p-3'>
      <p className='text-sm font-semibold'>Precios champagne por anfitrionas</p>
      <div className='grid grid-cols-[2.5rem_1fr_1fr] gap-2 items-center'>
        <ColumnHeaders />
        {tiers.flatMap((t, i) => [
          <span
            key={`n-${t.anfitrionas}`}
            className='inline-flex items-center justify-center h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold text-sm'
          >
            {t.anfitrionas}
          </span>,
          <Input
            key={`p-${t.anfitrionas}`}
            value={t.precio}
            onChange={e => onTierChange(i, 'precio', formatMiles(e.target.value))}
            inputMode='numeric'
            disabled={saving}
            className='h-10'
          />,
          <Input
            key={`c-${t.anfitrionas}`}
            value={t.comision}
            onChange={e => onTierChange(i, 'comision', formatMiles(e.target.value))}
            inputMode='numeric'
            disabled={saving}
            className='h-10'
          />
        ])}
      </div>
    </div>
  );
});
