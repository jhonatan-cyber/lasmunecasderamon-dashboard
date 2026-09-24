'use client';

import type { UnidadCodigoItem } from '@/hooks/personal/useProductForm';

interface CodeDeactivationPickerProps {
  presentacionId: number | string;
  currentStock: number;
  desiredStock: number;
  unidadesCodigos: UnidadCodigoItem[];
  codigosSeleccionados: Array<number | string>;
  onToggle: (id: string) => void;
}

export function CodeDeactivationPicker({
  presentacionId,
  currentStock,
  desiredStock,
  unidadesCodigos,
  codigosSeleccionados,
  onToggle
}: CodeDeactivationPickerProps) {
  const aDesactivar =
    Number.isInteger(desiredStock) && desiredStock < currentStock ? currentStock - desiredStock : 0;
  if (aDesactivar <= 0) return null;

  const activas = unidadesCodigos.filter(
    u => u.presentacion_id === presentacionId && u.estado === 'almacen'
  );

  return (
    <div className='space-y-1.5 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10 p-2.5'>
      <p className='text-[11px] font-semibold text-amber-700 dark:text-amber-400 ml-1'>
        Selecciona {aDesactivar} código(s) a desactivar ({codigosSeleccionados.length}/{aDesactivar}
        )
      </p>
      <div className='flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1'>
        {activas.map(u => {
          const checked = codigosSeleccionados.includes(u.id);
          return (
            <label
              key={u.id}
              htmlFor={`codigo-${u.id}`}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg font-mono text-xs cursor-pointer border transition-colors ${
                checked
                  ? 'bg-amber-200 dark:bg-amber-800/50 border-amber-400 text-amber-900 dark:text-amber-200'
                  : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              <input
                id={`codigo-${u.id}`}
                type='checkbox'
                checked={checked}
                onChange={() => onToggle(u.id)}
                className='accent-amber-600 w-3.5 h-3.5'
              />
              <span>{u.codigo_barras || u.codigo}</span>
              <span className='ml-2 font-sans text-xs'>
                {u.compra_folio ? `Compra ${u.compra_folio}` : 'Sin compra asociada'}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
