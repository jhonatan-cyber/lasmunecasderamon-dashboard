'use client';
import { MetricCard } from '@/components/shared/MetricCard';

import { DollarSign, Users, Wallet } from 'lucide-react';

interface TipsStatsCardsProps {
  totalTips: number;
  totalUsuarios: number;
  tipsPorUsuario: number;
  formatCurrency: (n: number) => string;
}

export default function TipsStatsCards({
  totalTips,
  totalUsuarios,
  tipsPorUsuario,
  formatCurrency
}: TipsStatsCardsProps) {
  return (
    <div className='grid gap-4 grid-cols-2 lg:grid-cols-3 mb-6'>
      {}
      <MetricCard
        tone='emerald'
        icon={<DollarSign className='h-4 w-4 text-emerald-600' />}
        badge='Propinas'
        label='Total Propinas'
        value={formatCurrency(totalTips)}
      />

      {}
      <MetricCard
        tone='blue'
        icon={<Users className='h-4 w-4 text-blue-600' />}
        badge='Personal'
        label='Usuarios'
        value={totalUsuarios}
      />

      {}
      <MetricCard
        tone='violet'
        icon={<Wallet className='h-4 w-4 text-violet-600' />}
        badge='Promedio'
        label='Por Usuario'
        value={formatCurrency(tipsPorUsuario)}
        footer={
          <div className='flex items-center gap-1.5 pt-1'>
            <span className='text-[10px] text-violet-700/50 font-medium uppercase tracking-tighter italic'>
              Cajero y Garzón
            </span>
          </div>
        }
      />
    </div>
  );
}
