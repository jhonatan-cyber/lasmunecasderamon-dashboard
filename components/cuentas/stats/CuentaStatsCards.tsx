'use client';
import { MetricCard } from '@/components/shared/MetricCard';

import { CuentaWithDetails } from '@/types/cuenta';
import { Receipt, DollarSign, Users, Building2 } from 'lucide-react';
import { useCuentaStatsCalculations } from '@/hooks/cuentas';

interface CuentaStatsCardsProps {
  cuentas: CuentaWithDetails[];
  formatCurrency: (value: number) => string;
}

export default function CuentaStatsCards({ cuentas, formatCurrency }: CuentaStatsCardsProps) {
  const { totalCuentas, cuentasActivas, totalIngresos, totalComisiones } =
    useCuentaStatsCalculations(cuentas);

  return (
    <div className='grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6'>
      {}
      <MetricCard
        tone='blue'
        icon={<Receipt className='h-4 w-4 text-blue-600' />}
        badge='Total'
        label='Cuentas'
        value={totalCuentas}
      />

      {}
      <MetricCard
        tone='emerald'
        icon={<Users className='h-4 w-4 text-emerald-600' />}
        badge='Activas'
        label='Abiertas'
        value={cuentasActivas}
      />

      {}
      <MetricCard
        tone='violet'
        icon={<DollarSign className='h-4 w-4 text-violet-600' />}
        badge='Ingresos'
        label='Total'
        value={formatCurrency(totalIngresos)}
      />

      {}
      <MetricCard
        tone='amber'
        icon={<Building2 className='h-4 w-4 text-amber-600' />}
        badge='Comisiones'
        label='Generadas'
        value={formatCurrency(totalComisiones)}
      />
    </div>
  );
}
