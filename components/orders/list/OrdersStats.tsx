'use client';
import { MetricCard } from '@/components/shared/MetricCard';

import { CheckCircle2, Clock, XCircle, TrendingUp, AlertCircle, ShoppingCart } from 'lucide-react';
import { Order, SolicitudServicio } from '@/hooks/orders/useOrdersList';
import { formatCurrency } from '@/lib/business/salesUtils';

interface OrdersStatsProps {
  activeTab: string;
  orders: Order[];
  servicios: SolicitudServicio[];
}

export const OrdersStats = ({ activeTab, orders, servicios }: OrdersStatsProps) => {
  if (activeTab === 'productos') {
    const stats = {
      total: orders.length,
      pendientes: orders.filter(o => o.estado === 1).length,
      completadas: orders.filter(o => o.estado === 0).length,
      canceladas: orders.filter(o => o.estado === 2).length,
      montoTotal: orders.reduce((acc, o) => acc + (o.total || 0), 0),
      montoPendientes: orders
        .filter(o => o.estado === 1)
        .reduce((acc, o) => acc + (o.total || 0), 0),
      montoCompletadas: orders
        .filter(o => o.estado === 0)
        .reduce((acc, o) => acc + (o.total || 0), 0),
      montoCanceladas: orders
        .filter(o => o.estado === 2)
        .reduce((acc, o) => acc + (o.total || 0), 0)
    };

    return (
      <div className='grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4 mb-6 px-4 sm:px-8'>
        {}
        <MetricCard
          tone='emerald'
          icon={<ShoppingCart className='h-4 w-4 text-emerald-600' />}
          badge='Total'
          label='Total Órdenes'
          value={<>${formatCurrency(stats.montoTotal)}</>}
          footer={
            <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
              <span className='text-emerald-700 font-black text-sm'>{stats.total}</span>
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
          value={<>${formatCurrency(stats.montoPendientes)}</>}
          footer={
            <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
              <span className='text-blue-700 font-black text-sm'>{stats.pendientes}</span>
              <span className='text-[10px] text-blue-700/50 font-medium uppercase tracking-tighter italic'>
                En espera
              </span>
            </div>
          }
        />

        {}
        <MetricCard
          tone='emerald'
          icon={<CheckCircle2 className='h-4 w-4 text-emerald-600' />}
          badge='Completadas'
          label='Aprobadas'
          value={<>${formatCurrency(stats.montoCompletadas)}</>}
          footer={
            <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
              <span className='text-emerald-700 font-black text-sm'>{stats.completadas}</span>
              <span className='text-[10px] text-emerald-700/50 font-medium uppercase tracking-tighter italic'>
                Exitosas
              </span>
            </div>
          }
        />

        {}
        <MetricCard
          tone='rose'
          icon={<XCircle className='h-4 w-4 text-rose-600' />}
          badge='Canceladas'
          label='Rechazadas'
          value={<>${formatCurrency(stats.montoCanceladas)}</>}
          footer={
            <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
              <span className='text-rose-700 font-black text-sm'>{stats.canceladas}</span>
              <span className='text-[10px] text-rose-700/50 font-medium uppercase tracking-tighter italic'>
                No procesadas
              </span>
            </div>
          }
        />
      </div>
    );
  }

  const serviciosStats = {
    total: servicios.length,
    pendientes: servicios.filter(s => s.estado === 'pendiente').length,
    aprobadas: servicios.filter(s => s.estado === 'aprobada').length
  };

  return (
    <div className='grid gap-4 grid-cols-2 sm:grid-cols-3 mb-6 px-4 sm:px-8'>
      {}
      <MetricCard
        tone='emerald'
        icon={<ShoppingCart className='h-4 w-4 text-emerald-600' />}
        badge='Total'
        label='Solicitudes'
        value={serviciosStats.total}
        footer={
          <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
            <span className='text-emerald-700 font-bold text-sm'>Servicios</span>
          </div>
        }
      />

      {}
      <MetricCard
        tone='blue'
        icon={<Clock className='h-4 w-4 text-blue-600' />}
        badge='Pendientes'
        label='Por Aprobar'
        value={serviciosStats.pendientes}
        footer={
          <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
            <span className='text-blue-700 font-bold text-sm'>En espera</span>
          </div>
        }
      />

      {}
      <MetricCard
        tone='emerald'
        className='col-span-2 sm:col-span-1'
        icon={<CheckCircle2 className='h-4 w-4 text-emerald-600' />}
        badge='Aprobadas'
        label='Completadas'
        value={serviciosStats.aprobadas}
        footer={
          <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
            <span className='text-emerald-700 font-bold text-sm'>Exitosas</span>
          </div>
        }
      />
    </div>
  );
};
