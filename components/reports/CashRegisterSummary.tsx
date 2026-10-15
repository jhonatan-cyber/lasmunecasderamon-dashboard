'use client';
import { MetricCard } from '@/components/shared/MetricCard';

import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { Clock, Wallet, TrendingUp, TrendingDown, ArrowDownCircle, DollarSign } from 'lucide-react';

interface SummaryData {
  cajas: number;
  apertura_total: number;
  cierre_total: number;
  diferencia_total: number;
  devoluciones: number;
  iva: number;
}

interface CashRegisterSummaryProps {
  summary: SummaryData;
}

export function CashRegisterSummary({ summary }: CashRegisterSummaryProps) {
  const isDiferenciaNegative = summary.diferencia_total < 0;

  return (
    <div className='grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-4'>
      {/* Apertura */}
      <MetricCard
        tone={'blue'}
        badge={'Apertura'}
        label={'Caja Inicial'}
        value={formatCurrencyNoDecimals(summary.apertura_total)}
        icon={<Clock className='h-4 w-4' />}
        footer={<p className='pt-1 text-xs opacity-70'>{`${summary.cajas} cajas operativas`}</p>}
      />

      {/* Cierre */}
      <MetricCard
        tone={'emerald'}
        badge={'Cierre'}
        label={'Total Reportado'}
        value={formatCurrencyNoDecimals(summary.cierre_total)}
        icon={<Wallet className='h-4 w-4' />}
        footer={<p className='pt-1 text-xs opacity-70'>{'Suma de cierres'}</p>}
      />

      {/* Diferencia */}
      <MetricCard
        tone={isDiferenciaNegative ? 'red' : 'amber'}
        badge={'Diferencia'}
        label={'Descuadre'}
        value={formatCurrencyNoDecimals(summary.diferencia_total)}
        icon={
          isDiferenciaNegative ? (
            <TrendingDown className='h-4 w-4' />
          ) : (
            <TrendingUp className='h-4 w-4' />
          )
        }
        footer={<p className='pt-1 text-xs opacity-70'>{'Cierre - Total'}</p>}
      />

      {/* Devoluciones */}
      <MetricCard
        tone={'rose'}
        badge={'Devoluciones'}
        label={'Reintegros'}
        value={formatCurrencyNoDecimals(summary.devoluciones)}
        icon={<ArrowDownCircle className='h-4 w-4' />}
        footer={<p className='pt-1 text-xs opacity-70'>{'Total reintegrado'}</p>}
      />

      {/* Impuestos */}
      <MetricCard
        tone={'purple'}
        badge={'Impuestos'}
        label={'IVA Retenido'}
        value={formatCurrencyNoDecimals(summary.iva)}
        icon={<DollarSign className='h-4 w-4' />}
        footer={<p className='pt-1 text-xs opacity-70'>{'Transacciones'}</p>}
      />
    </div>
  );
}
