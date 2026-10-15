'use client';
import { MetricCard } from '@/components/shared/MetricCard';

import { CheckCircle2, Clock, XCircle, TrendingUp, ShoppingCart, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/business/salesUtils';

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
      {}
      <MetricCard
        tone='emerald'
        icon={<DollarSign className='h-4 w-4 text-emerald-600' />}
        badge='Ganancias'
        label='Total Ganado'
        value={<>${formatCurrency(totalAmount)}</>}
        footer={
          <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
            <span className='text-emerald-700 font-black text-sm'>{totalOrders}</span>
            <span className='text-[10px] text-emerald-700/50 font-medium uppercase tracking-tighter italic'>
              Pedidos
            </span>
          </div>
        }
      />

      {}
      <MetricCard
        tone='blue'
        icon={<Clock className='h-4 w-4 text-blue-600' />}
        badge='Pendientes'
        label='Por Aprobar'
        value={pendingOrders}
        footer={
          <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
            <span className='text-blue-700 font-bold text-sm'>En espera</span>
          </div>
        }
      />

      {}
      <MetricCard
        tone='emerald'
        icon={<CheckCircle2 className='h-4 w-4 text-emerald-600' />}
        badge='Aprobados'
        label='Completados'
        value={approvedOrders}
        footer={
          <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
            <span className='text-emerald-700 font-bold text-sm'>Exitosos</span>
          </div>
        }
      />

      {}
      <MetricCard
        tone='rose'
        icon={<XCircle className='h-4 w-4 text-rose-600' />}
        badge='Rechazados'
        label='Cancelados'
        value={rejectedOrders}
        footer={
          <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
            <span className='text-rose-700 font-bold text-sm'>No procesados</span>
          </div>
        }
      />
    </div>
  );
}
