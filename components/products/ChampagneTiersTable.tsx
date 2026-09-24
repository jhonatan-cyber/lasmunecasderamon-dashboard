'use client';

import { Input } from '@/components/ui/input';
import type { ChampagneTier } from '@/hooks/personal/useChampagneTiers';

interface ChampagneTiersTableProps {
  tiers: ChampagneTier[];
  cargandoTiers: boolean;
  guardandoTiers: boolean;
  isLoading: boolean;
  onSave: () => void;
  onFieldChange: (index: number, field: 'precio' | 'comision', value: string) => void;
}

export function ChampagneTiersTable({
  tiers,
  cargandoTiers,
  guardandoTiers,
  isLoading,
  onSave,
  onFieldChange
}: ChampagneTiersTableProps) {
  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between ml-1'>
        <label className='block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400'>
          Precios champagne por anfitrionas
        </label>
        <button
          type='button'
          onClick={onSave}
          disabled={isLoading || guardandoTiers || cargandoTiers}
          className='px-3 py-1.5 text-xs font-semibold rounded-full bg-black text-white dark:bg-white dark:text-black hover:scale-105 transition-all disabled:opacity-50'
        >
          {guardandoTiers ? 'Guardando...' : 'Guardar tabla'}
        </button>
      </div>
      {cargandoTiers ? (
        <p className='text-xs text-gray-400 ml-1'>Cargando tabla...</p>
      ) : (
        <div className='space-y-2'>
          <div className='grid grid-cols-[3rem_1fr_1fr] gap-2 items-center px-1'>
            <span className='text-[10px] font-bold uppercase tracking-wider text-gray-400'>N°</span>
            <span className='text-[10px] font-bold uppercase tracking-wider text-gray-400'>
              Precio
            </span>
            <span className='text-[10px] font-bold uppercase tracking-wider text-gray-400'>
              Comisión
            </span>
          </div>
          {tiers.map((t, i) => (
            <div key={t.anfitrionas} className='grid grid-cols-[3rem_1fr_1fr] gap-2 items-center'>
              <span className='inline-flex items-center justify-center h-11 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold text-sm'>
                {t.anfitrionas}
              </span>
              <Input
                value={t.precio}
                onChange={e => onFieldChange(i, 'precio', e.target.value)}
                placeholder='0'
                disabled={isLoading || guardandoTiers}
                inputMode='numeric'
                className='h-11'
              />
              <Input
                value={t.comision}
                onChange={e => onFieldChange(i, 'comision', e.target.value)}
                placeholder='0'
                disabled={isLoading || guardandoTiers}
                inputMode='numeric'
                className='h-11'
              />
            </div>
          ))}
          <p className='text-[11px] text-gray-400 ml-1'>
            En ventas, al elegir N anfitrionas el precio y la comisión se toman de esta tabla.
          </p>
        </div>
      )}
    </div>
  );
}
