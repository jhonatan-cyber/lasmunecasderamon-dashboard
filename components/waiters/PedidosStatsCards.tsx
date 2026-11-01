'use client';
import { MetricCard } from '@/components/shared/MetricCard';

import { CheckCircle2, Clock, XCircle, DollarSign } from 'lucide-react';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

interface PedidosStatsCardsProps {
  totalOrders: number;
  totalAmount: number;
  pendingOrders: number;
  approvedOrders: number;
  rejectedOrders: number;
}

export default function PedidosStatsCards({
  totalOrders,
  totalAmount,
  pendingOrders,
  approvedOrders,
  rejectedOrders
}: PedidosStatsCardsProps) {
  return (
    <div className='grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4 mb-6 px-4 sm:px-8'>
      <MetricCard
        tone='emerald'
        icon={<DollarSign className='h-4 w-4 text-emerald-600' />}
        badge='Ganancias'
        label='Total Ganado'
        value={formatCurrencyCLP(totalAmount)}
        footerValue={totalOrders}
        footerLabel='Pedidos'
        footerAlign='center-sm'
      />

      <MetricCard
        tone='blue'
        icon={<Clock className='h-4 w-4 text-blue-600' />}
        badge='Pendientes'
        label='Por Aprobar'
        value={pendingOrders}
        footerValue='En espera'
        footerAlign='center-sm'
      />

      <MetricCard
        tone='emerald'
        icon={<CheckCircle2 className='h-4 w-4 text-emerald-600' />}
        badge='Aprobados'
        label='Completados'
        value={approvedOrders}
        footerValue='Exitosos'
        footerAlign='center-sm'
      />

      <MetricCard
        tone='rose'
        icon={<XCircle className='h-4 w-4 text-rose-600' />}
        badge='Rechazados'
        label='Cancelados'
        value={rejectedOrders}
        footerValue='No procesados'
        footerAlign='center-sm'
      />
    </div>
  );
}
