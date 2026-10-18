'use client';

import { MetricCard } from '@/components/shared/MetricCard';
import { DollarSign, TrendingDown, Wallet } from 'lucide-react';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

interface PayrollSummaryStatsProps {
  totals: {
    sueldo: number;
    descuento: number;
    total: number;
  };
  isLoading?: boolean;
}

export default function PayrollSummaryStats({
  totals,
  isLoading = false
}: PayrollSummaryStatsProps) {
  return (
    <section className='space-y-3'>
      <h2 className='text-lg font-semibold'>Resumen de Planilla</h2>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <MetricCard
          icon={<DollarSign />}
          badge='Bruto'
          label='Total Sueldos'
          value={formatCurrencyCLP(totals.sueldo)}
          tone='blue'
          isLoading={isLoading}
        />
        <MetricCard
          icon={<TrendingDown />}
          badge='Descuentos'
          label='Total Descuentos'
          value={formatCurrencyCLP(totals.descuento)}
          tone='rose'
          isLoading={isLoading}
        />
        <MetricCard
          icon={<Wallet />}
          badge='Neto'
          label='Total a Pagar'
          value={formatCurrencyCLP(totals.total)}
          tone='emerald'
          isLoading={isLoading}
        />
      </div>
    </section>
  );
}
