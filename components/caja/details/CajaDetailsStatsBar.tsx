'use client';

import { memo } from 'react';
import { BarChart3, ChevronDown } from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { CajaPaymentSummary, CajaSummaryMetrics } from '@/components/caja/details';
import type { CajaDetailsNumbers } from '@/components/caja/details/cajaDetailsModel';

/**
 * Barra sticky de estadísticas del modal: colapsada muestra el mini-resumen
 * (efectivo neto / egresos / total real); abierta despliega el desglose de
 * pagos y las métricas.
 */
export const CajaDetailsStatsBar = memo(function CajaDetailsStatsBar({
  statsOpen,
  onToggle,
  numeros,
  isLoadingSummary
}: {
  statsOpen: boolean;
  onToggle: () => void;
  numeros: CajaDetailsNumbers;
  isLoadingSummary: boolean;
}) {
  return (
    <div className='sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-gray-100 dark:border-gray-800 px-6 py-4 print:hidden'>
      <div className='flex items-center justify-between gap-4'>
        <button
          type='button'
          onClick={onToggle}
          className='flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors'
          aria-expanded={statsOpen}
        >
          <div className='p-1.5 bg-slate-100 dark:bg-white/10 rounded-lg'>
            <BarChart3 className='w-4 h-4' />
          </div>
          Estadísticas
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${statsOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {!statsOpen && (
          <div className='flex items-center gap-4 sm:gap-6 text-sm'>
            <div className='text-right'>
              <p className='text-[10px] font-bold text-slate-400 uppercase'>Efectivo</p>
              <p className='font-black tabular-nums text-slate-700 dark:text-slate-200'>
                {formatCurrencyNoDecimals(numeros.efectivoNeto)}
              </p>
            </div>
            <div className='text-right'>
              <p className='text-[10px] font-bold text-slate-400 uppercase'>Egresos</p>
              <p className='font-black tabular-nums text-rose-600'>
                {formatCurrencyNoDecimals(numeros.egresosCaja)}
              </p>
            </div>
            <div className='text-right'>
              <p className='text-[10px] font-bold text-slate-400 uppercase'>Total real</p>
              <p className='font-black tabular-nums text-emerald-600'>
                {formatCurrencyNoDecimals(numeros.totalReal)}
              </p>
            </div>
          </div>
        )}
      </div>

      {statsOpen && (
        <div className='space-y-4 mt-3'>
          <CajaPaymentSummary
            isLoading={isLoadingSummary}
            efectivoNeto={numeros.efectivoNeto}
            tarjetaCaja={numeros.tarjetaCaja}
            transferenciaCaja={numeros.transferenciaCaja}
          />

          <CajaSummaryMetrics
            isLoading={isLoadingSummary}
            totalMetodosPago={numeros.totalMetodosPago}
            totalEgresos={numeros.egresosCaja}
            totalReal={numeros.totalReal}
          />
        </div>
      )}
    </div>
  );
});
