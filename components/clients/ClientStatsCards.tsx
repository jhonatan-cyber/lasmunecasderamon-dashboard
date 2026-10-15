'use client';
import { MetricCard } from '@/components/shared/MetricCard';

import { Users, UserCheck, Wallet, DollarSign } from 'lucide-react';
import { Client } from '@/types/client';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

interface ClientStatsCardsProps {
  clients: Client[];
}

export function ClientStatsCards({ clients }: ClientStatsCardsProps) {
  const stats = {
    total: clients?.length || 0,
    activos: (clients || []).filter(c => c.status !== 0).length,
    conSaldo: (clients || []).filter(c => Number(c.saldo || 0) > 0).length
  };

  const totals = {
    totalSaldo: (clients || []).reduce((acc, c) => acc + Number(c.saldo || 0), 0)
  };

  return (
    <div className='grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6'>
      {}
      <MetricCard
        tone='blue'
        icon={<Users className='h-4 w-4 text-blue-600' />}
        badge='Total'
        label='Clientes'
        value={stats.total}
      />

      {}
      <MetricCard
        tone='emerald'
        icon={<UserCheck className='h-4 w-4 text-emerald-600' />}
        badge='Activos'
        label='Clientes'
        value={stats.activos}
      />

      {}
      <MetricCard
        tone='amber'
        icon={<Wallet className='h-4 w-4 text-amber-600' />}
        badge='Con Saldo'
        label='Prepago'
        value={stats.conSaldo}
      />

      {}
      <MetricCard
        tone='violet'
        icon={<DollarSign className='h-4 w-4 text-violet-600' />}
        badge='Total Saldo'
        label='Prepago'
        value={formatCurrencyCLP(totals.totalSaldo)}
      />
    </div>
  );
}
