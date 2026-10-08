'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';

interface CajaFinancialDetailsProps {
  isLoading: boolean;
  prepagoCargado: number;
  prepagoConsumido: number;
  ingresosReales: number;
  devoluciones: number;
  anticipos: number;
  retirosTotal: number;
  prepagoPendienteClientes: number;
  /** Saldos de clientes descontados del efectivo al cerrar la caja. */
  saldoClientesDescontado?: number;
  /** Saldo prepago que quedó pendiente de devolución al agotarse el efectivo. */
  saldoClientesPorDevolver?: number;
  /** Monto con que quedó cerrada la caja (0 si sigue abierta). */
  montoCierre?: number;
  mostrarMontoCierre?: boolean;
}

function FinancialSkeleton() {
  return (
    <>
      <Skeleton className='h-10 w-full' />
      <Skeleton className='h-10 w-full' />
      <Skeleton className='h-10 w-full' />
      <Skeleton className='h-12 w-full' />
    </>
  );
}

function Row({
  label,
  value,
  valueClassName = 'font-bold text-gray-900 dark:text-white'
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className='flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700/50'>
      <span className='text-sm text-gray-600 dark:text-gray-400'>{label}</span>
      <span className={valueClassName}>{value}</span>
    </div>
  );
}

export function CajaFinancialDetails({
  isLoading,
  prepagoCargado,
  prepagoConsumido,
  ingresosReales,
  devoluciones,
  anticipos,
  retirosTotal,
  prepagoPendienteClientes,
  saldoClientesDescontado = 0,
  saldoClientesPorDevolver = 0,
  montoCierre = 0,
  mostrarMontoCierre = montoCierre > 0
}: CajaFinancialDetailsProps) {
  return (
    <div className='bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
      <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
        <h4 className='font-bold text-gray-900 dark:text-white'>Detalle Financiero</h4>
      </div>
      <div className='p-4'>
        {isLoading ? (
          <FinancialSkeleton />
        ) : (
          <>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-x-8'>
              <div>
                <p className='text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1'>
                  Ingresos
                </p>
                <Row
                  label='Ingreso Real a Caja'
                  value={formatCurrencyNoDecimals(ingresosReales)}
                  valueClassName='font-bold text-cyan-600 dark:text-cyan-400'
                />
                <Row
                  label='Prepago Cargado'
                  value={formatCurrencyNoDecimals(prepagoCargado)}
                  valueClassName='font-bold text-sky-600 dark:text-sky-400'
                />
                <Row
                  label='Prepago Consumido'
                  value={formatCurrencyNoDecimals(prepagoConsumido)}
                  valueClassName='font-bold text-violet-600 dark:text-violet-400'
                />
              </div>

              <div>
                <p className='text-xs font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-1 mt-4 md:mt-0'>
                  Egresos por descontar
                </p>
                <Row
                  label='Devoluciones'
                  value={`-${formatCurrencyNoDecimals(devoluciones)}`}
                  valueClassName='font-bold text-rose-600'
                />
                {saldoClientesDescontado > 0 && (
                  <Row
                    label='Saldos de clientes descontados'
                    value={`-${formatCurrencyNoDecimals(saldoClientesDescontado)}`}
                    valueClassName='font-bold text-rose-600'
                  />
                )}
                {saldoClientesPorDevolver > 0 && (
                  <Row
                    label='Falta devolver a clientes'
                    value={formatCurrencyNoDecimals(saldoClientesPorDevolver)}
                    valueClassName='font-bold text-amber-600 dark:text-amber-400'
                  />
                )}
                <p className='text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-3 mb-1'>
                  Ya salieron del efectivo (no se descuentan dos veces):
                </p>
                <Row
                  label='Anticipos'
                  value={`-${formatCurrencyNoDecimals(anticipos)}`}
                  valueClassName='font-bold text-rose-600'
                />
                <Row
                  label='Retiros'
                  value={`-${formatCurrencyNoDecimals(retirosTotal)}`}
                  valueClassName='font-bold text-rose-600'
                />
              </div>
            </div>

            <div className='rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 mt-4 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300'>
              <div className='flex justify-between gap-4'>
                <span>Saldo prepago pendiente clientes</span>
                <span className='font-bold'>
                  {formatCurrencyNoDecimals(prepagoPendienteClientes)}
                </span>
              </div>
              {saldoClientesDescontado > 0 && (
                <div className='flex justify-between gap-4 mt-1'>
                  <span>De ese saldo, descontado en este cierre</span>
                  <span className='font-bold text-rose-600'>
                    {formatCurrencyNoDecimals(saldoClientesDescontado)}
                  </span>
                </div>
              )}
              {saldoClientesPorDevolver > 0 && (
                <div className='flex justify-between gap-4 mt-1'>
                  <span>Saldo que falta devolver</span>
                  <span className='font-bold text-amber-600 dark:text-amber-400'>
                    {formatCurrencyNoDecimals(saldoClientesPorDevolver)}
                  </span>
                </div>
              )}
            </div>

            {mostrarMontoCierre && (
              <div className='flex justify-between items-center rounded-xl bg-emerald-50 px-4 py-3 mt-4 border border-emerald-200 dark:border-emerald-800 dark:bg-emerald-950/30'>
                <span className='text-sm font-bold text-emerald-900 dark:text-emerald-300'>
                  Monto de cierre
                </span>
                <span className='text-lg font-black tabular-nums text-emerald-700 dark:text-emerald-400'>
                  {formatCurrencyNoDecimals(montoCierre)}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
