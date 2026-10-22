'use client';
import { MetricCard } from '@/components/shared/MetricCard';

import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Anticipo } from '@/hooks/staff';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

interface AdvancesStatsCardsProps {
  advances: Anticipo[];
}

export default function AdvancesStatsCards({ advances }: AdvancesStatsCardsProps) {
  const stats = {
    aceptados: (advances || []).filter(a => Number(a.estado) === 1 || Number(a.estado) === 0),
    pendientes: (advances || []).filter(a => Number(a.estado) === 2),
    rechazados: (advances || []).filter(a => Number(a.estado) === 3)
  };

  const totals = {
    montoAceptados: stats.aceptados.reduce((acc, a) => acc + Number(a.monto), 0),
    montoPendientes: stats.pendientes.reduce((acc, a) => acc + Number(a.monto), 0),
    montoRechazados: stats.rechazados.reduce((acc, a) => acc + Number(a.monto), 0),
    countAceptados: stats.aceptados.length,
    countPendientes: stats.pendientes.length,
    countRechazados: stats.rechazados.length
  };

  return (
    <div className='grid gap-4 grid-cols-2 md:grid-cols-3 mb-6'>
      {}
      <MetricCard
        tone='emerald'
        icon={<CheckCircle2 className='h-4 w-4 text-emerald-600' />}
        badge='Aceptados'
        label='Total Aprobado'
        value={formatCurrencyCLP(totals.montoAceptados)}
        footer={
          <div className='flex items-center gap-1.5 pt-1'>
            <span className='text-emerald-700 font-black text-sm'>{totals.countAceptados}</span>
            <span className='text-[10px] text-emerald-700/50 font-medium uppercase tracking-tighter italic'>
              Solicitudes
            </span>
          </div>
        }
      />

      {}
      <MetricCard
        tone='amber'
        icon={<Clock className='h-4 w-4 text-amber-600' />}
        badge='Pendientes'
        label='En Espera'
        value={formatCurrencyCLP(totals.montoPendientes)}
        footer={
          <div className='flex items-center gap-1.5 pt-1'>
            <span className='text-amber-700 font-black text-sm'>{totals.countPendientes}</span>
            <span className='text-[10px] text-amber-700/50 font-medium uppercase tracking-tighter italic'>
              Solicitudes
            </span>
          </div>
        }
      />

      {}
      <MetricCard
        tone='rose'
        className='col-span-2 md:col-span-1'
        icon={<XCircle className='h-4 w-4 text-rose-600' />}
        badge='Rechazados'
        label='Rechazado'
        value={formatCurrencyCLP(totals.montoRechazados)}
        footer={
          <div className='flex items-center gap-1.5 pt-1'>
            <span className='text-rose-700 font-black text-sm'>{totals.countRechazados}</span>
            <span className='text-[10px] text-rose-700/50 font-medium uppercase tracking-tighter italic'>
              Solicitudes
            </span>
          </div>
        }
      />
    </div>
  );
}
