import React from 'react';
import { formatFechaLarga, formatSoloHora } from '@/lib/utils/formatters';

interface CajaInfoCardsProps {
  cajeroNombre?: string;
  fechaApertura: string | Date;
  cajeroCierreNombre?: string;
  fechaCierre?: string | Date;
}

export function CajaInfoCards({
  cajeroNombre,
  fechaApertura,
  cajeroCierreNombre,
  fechaCierre
}: CajaInfoCardsProps) {
  return (
    <div className='px-6 flex flex-col md:flex-row justify-between items-start gap-8'>
      {}
      <div className='bg-gray-50/50 dark:bg-gray-800/20 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 flex-1 w-full relative overflow-hidden group'>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10'>
          <div className='space-y-1'>
            <p className='text-[10px] font-black text-gray-400 uppercase tracking-widest'>
              Abierta por
            </p>
            <p className='text-sm font-bold text-gray-700 dark:text-gray-200'>
              {cajeroNombre || 'N/A'}
            </p>
          </div>
          <div className='space-y-1 sm:text-right'>
            <p className='text-[10px] font-black text-gray-400 uppercase tracking-widest'>
              Fecha Apertura
            </p>
            <p className='text-sm font-bold text-gray-700 dark:text-gray-200'>
              {formatFechaLarga(fechaApertura)}
            </p>
            <p className='text-[10px] font-bold text-gray-400'>{formatSoloHora(fechaApertura)}</p>
          </div>
        </div>
      </div>

      {}
      {fechaCierre && (
        <div className='bg-gray-50/50 dark:bg-gray-800/20 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 flex-1 w-full relative overflow-hidden group'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10'>
            <div className='space-y-1'>
              <p className='text-[10px] font-black text-gray-400 uppercase tracking-widest'>
                Cerrada por
              </p>
              <p className='text-sm font-bold text-gray-700 dark:text-gray-200'>
                {cajeroCierreNombre || 'Autoinformada'}
              </p>
            </div>
            <div className='space-y-1 sm:text-right'>
              <p className='text-[10px] font-black text-gray-400 uppercase tracking-widest'>
                Fecha Cierre
              </p>
              <p className='text-sm font-bold text-gray-700 dark:text-gray-200'>
                {formatFechaLarga(fechaCierre)}
              </p>
              <p className='text-[10px] font-bold text-gray-400'>{formatSoloHora(fechaCierre)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
