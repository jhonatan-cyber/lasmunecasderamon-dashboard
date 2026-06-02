'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';

interface CajaFinancialDetailsProps {
  isLoading: boolean;
  efectivoNeto: number;
  ventasTragos: number;
  ventasChampagne: number;
  ventasBarras: number;
  servicios: number;
  prepagoCargado: number;
  prepagoConsumido: number;
  ingresosReales: number;
  devoluciones: number;
  anticipos: number;
  retirosTotal: number;
  totalReal: number;
  prepagoPendienteClientes: number;
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
  efectivoNeto,
  ventasTragos,
  ventasChampagne,
  ventasBarras,
  servicios,
  prepagoCargado,
  prepagoConsumido,
  ingresosReales,
  devoluciones,
  anticipos,
  retirosTotal,
  totalReal,
  prepagoPendienteClientes
}: CajaFinancialDetailsProps) {
  return (
    <div className='bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
      <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
        <h4 className='font-bold text-gray-900 dark:text-white'>Detalle Financiero</h4>
      </div>
      <div className='p-4 space-y-3'>
        {isLoading ? (
          <FinancialSkeleton />
        ) : (
          <>
            <Row label='Efectivo Neto' value={formatCurrencyNoDecimals(efectivoNeto)} />
            <Row label='Ventas Tragos' value={formatCurrencyNoDecimals(ventasTragos)} />
            <Row label='Ventas Champaña' value={formatCurrencyNoDecimals(ventasChampagne)} />
            <Row label='Ventas Barras' value={formatCurrencyNoDecimals(ventasBarras)} />
            <Row
              label='Servicios'
              value={formatCurrencyNoDecimals(servicios)}
              valueClassName='font-bold text-emerald-600'
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
            <Row
              label='Ingreso Real a Caja'
              value={formatCurrencyNoDecimals(ingresosReales)}
              valueClassName='font-bold text-cyan-600 dark:text-cyan-400'
            />
            <Row
              label='Devoluciones'
              value={`-${formatCurrencyNoDecimals(devoluciones)}`}
              valueClassName='font-bold text-rose-600'
            />
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
            <div className='flex justify-between items-center py-3 bg-emerald-50 dark:bg-emerald-900/20 -mx-4 px-4 mt-2'>
              <span className='font-bold text-emerald-800 dark:text-emerald-200'>Total Real</span>
              <span className='text-xl font-black text-emerald-700 dark:text-emerald-300'>
                {formatCurrencyNoDecimals(totalReal)}
              </span>
            </div>
            <div className='rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300'>
              <div className='flex justify-between gap-4'>
                <span>Saldo prepago pendiente clientes</span>
                <span className='font-bold'>
                  {formatCurrencyNoDecimals(prepagoPendienteClientes)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
