'use client';

import {
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  HandCoins,
  PiggyBank,
  ReceiptText,
  Wallet
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardComposite } from '@/hooks/stats/useDashboardComposite';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

const metrics = [
  { key: 'sales', label: 'Ventas', icon: ArrowUpRight },
  { key: 'services', label: 'Servicios', icon: ReceiptText },
  { key: 'tips', label: 'Propinas', icon: Coins },
  { key: 'advances', label: 'Anticipos', icon: HandCoins },
  { key: 'withdrawals', label: 'Retiros', icon: ArrowDownLeft },
  { key: 'returns', label: 'Devoluciones', icon: Wallet }
] as const;

export default function FinancialSummary() {
  const { data: composite, isLoading, error } = useDashboardComposite();
  const data = composite?.insights;

  if (isLoading) {
    return (
      <Card className='border-slate-200/80 dark:border-slate-800'>
        <CardHeader className='space-y-3'>
          <Skeleton className='h-6 w-56' />
          <Skeleton className='h-4 w-72' />
        </CardHeader>
        <CardContent className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className='rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800'
            >
              <Skeleton className='mb-3 h-4 w-24' />
              <Skeleton className='h-8 w-24' />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null;
  }

  return (
    <section className='space-y-4'>
      <div>
        <h2 className='text-xl font-semibold text-slate-900 dark:text-slate-100'>
          Resumen Financiero Del Día
        </h2>
        <p className='mt-1 text-sm text-slate-600 dark:text-slate-400'>
          Consolidado ejecutivo del turno actual para revisar ingresos, salidas y neto sin entrar a
          caja.
        </p>
      </div>

      <Card className='overflow-hidden border-slate-200/80 dark:border-slate-800'>
        <CardHeader className='border-b border-slate-200/80 bg-linear-to-r from-slate-50 to-white dark:border-slate-800 dark:from-slate-950 dark:to-slate-900'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
            <div>
              <CardTitle className='text-lg'>Consolidado financiero</CardTitle>
              <p className='mt-1 text-sm text-slate-600 dark:text-slate-400'>
                Apertura: {formatCurrencyCLP(data.financialSummary.openingAmount)}
              </p>
            </div>

            <div className='rounded-2xl bg-slate-900 px-4 py-3 text-white dark:bg-slate-100 dark:text-slate-900'>
              <p className='text-xs uppercase tracking-[0.2em] text-white/70 dark:text-slate-500'>
                Neto estimado
              </p>
              <p className='mt-1 text-3xl font-bold tracking-tight'>
                {formatCurrencyCLP(data.financialSummary.netRevenue)}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className='grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3'>
          {metrics.map(metric => {
            const Icon = metric.icon;
            const value = data.financialSummary[metric.key];

            return (
              <div
                key={metric.key}
                className='rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/30'
              >
                <div className='flex items-center justify-between gap-3'>
                  <p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
                    {metric.label}
                  </p>
                  <div className='flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'>
                    <Icon className='h-4 w-4' />
                  </div>
                </div>
                <p className='mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white'>
                  {formatCurrencyCLP(value)}
                </p>
              </div>
            );
          })}

          <div className='rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/30'>
            <div className='flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-xs dark:bg-slate-800 dark:text-slate-200'>
              <PiggyBank className='h-4 w-4' />
            </div>
            <p className='mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100'>
              Lectura rápida
            </p>
            <p className='mt-2 text-sm text-slate-600 dark:text-slate-400'>
              El neto combina ventas, servicios y propinas, descontando devoluciones y retiros de
              caja ya registrados.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
