'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { UnitLabelSelector } from './UnitLabelSelector';
import type { UnidadCodigoItem } from '@/hooks/personal/useProductForm';

interface GeneratedCodesPanelProps {
  isScoped: boolean;
  codesCount: number;
  unidadesTotal: number;
  unidadesInactivas: number;
  cargandoInventario: boolean;
  codigosVisibles: UnidadCodigoItem[];
}

export function GeneratedCodesPanel({
  isScoped,
  codesCount,
  unidadesTotal,
  unidadesInactivas,
  cargandoInventario,
  codigosVisibles
}: GeneratedCodesPanelProps) {
  const [mostrarCodigos, setMostrarCodigos] = useState(false);

  return (
    <div className='rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden'>
      <button
        type='button'
        onClick={() => setMostrarCodigos(v => !v)}
        className='w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors'
      >
        <span className='text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400'>
          Códigos generados ({isScoped ? codesCount : unidadesTotal}
          {unidadesInactivas > 0 ? ` · ${unidadesInactivas} inactivos` : ''})
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${mostrarCodigos ? 'rotate-180' : ''}`}
        />
      </button>
      {mostrarCodigos && (
        <div className='p-3'>
          {codigosVisibles.length === 0 ? (
            <p className='text-xs text-gray-400 text-center py-2'>
              {cargandoInventario ? 'Cargando...' : 'Sin códigos generados'}
            </p>
          ) : (
            <UnitLabelSelector units={codigosVisibles} />
          )}
        </div>
      )}
    </div>
  );
}
