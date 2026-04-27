'use client';

import { Card, CardContent } from '@/components/ui/card';
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
      <div className='grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-6 px-4 sm:px-8'>
        {/* Total Órdenes */}
        <Card
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}
          className='shadow-sm border-none backdrop-blur-sm rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all duration-300'
        >
          <CardContent className='p-5'>
            <div className='flex items-center justify-between mb-4'>
              <div className='p-2.5 bg-emerald-500/20 rounded-2xl'>
                <ShoppingCart className='h-4 w-4 text-emerald-600' />
              </div>
              <span className='text-[8px] font-black uppercase tracking-[0.2em] text-emerald-700 bg-emerald-500/10 px-2 py-1 rounded-full text-center'>
                Total
              </span>
            </div>
            <div className='space-y-0.5 text-center sm:text-left'>
              <p className='text-[10px] font-bold text-emerald-700/60 uppercase tracking-widest'>
                Total Órdenes
              </p>
              <h3 className='text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-100'>
                ${formatCurrency(stats.montoTotal)}
              </h3>
              <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
                <span className='text-emerald-700 font-black text-sm'>{stats.total}</span>
                <span className='text-[10px] text-emerald-700/50 font-medium uppercase tracking-tighter italic'>
                  Pedidos
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pendientes */}
        <Card
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.2)'
          }}
          className='shadow-sm border-none backdrop-blur-sm rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all duration-300'
        >
          <CardContent className='p-5'>
            <div className='flex items-center justify-between mb-4'>
              <div className='p-2.5 bg-blue-500/20 rounded-2xl'>
                <Clock className='h-4 w-4 text-blue-600' />
              </div>
              <span className='text-[8px] font-black uppercase tracking-[0.2em] text-blue-700 bg-blue-500/10 px-2 py-1 rounded-full text-center'>
                Pendientes
              </span>
            </div>
            <div className='space-y-0.5 text-center sm:text-left'>
              <p className='text-[10px] font-bold text-blue-700/60 uppercase tracking-widest'>
                Por Aprobar
              </p>
              <h3 className='text-xl sm:text-2xl font-black text-blue-900 dark:text-blue-100'>
                ${formatCurrency(stats.montoPendientes)}
              </h3>
              <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
                <span className='text-blue-700 font-black text-sm'>{stats.pendientes}</span>
                <span className='text-[10px] text-blue-700/50 font-medium uppercase tracking-tighter italic'>
                  En espera
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completadas */}
        <Card
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}
          className='shadow-sm border-none backdrop-blur-sm rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all duration-300'
        >
          <CardContent className='p-5'>
            <div className='flex items-center justify-between mb-4'>
              <div className='p-2.5 bg-emerald-500/20 rounded-2xl'>
                <CheckCircle2 className='h-4 w-4 text-emerald-600' />
              </div>
              <span className='text-[8px] font-black uppercase tracking-[0.2em] text-emerald-700 bg-emerald-500/10 px-2 py-1 rounded-full text-center'>
                Completadas
              </span>
            </div>
            <div className='space-y-0.5 text-center sm:text-left'>
              <p className='text-[10px] font-bold text-emerald-700/60 uppercase tracking-widest'>
                Aprobadas
              </p>
              <h3 className='text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-100'>
                ${formatCurrency(stats.montoCompletadas)}
              </h3>
              <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
                <span className='text-emerald-700 font-black text-sm'>{stats.completadas}</span>
                <span className='text-[10px] text-emerald-700/50 font-medium uppercase tracking-tighter italic'>
                  Exitosas
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Canceladas */}
        <Card
          style={{
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.2)'
          }}
          className='shadow-sm border-none backdrop-blur-sm rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all duration-300'
        >
          <CardContent className='p-5'>
            <div className='flex items-center justify-between mb-4'>
              <div className='p-2.5 bg-rose-500/20 rounded-2xl'>
                <XCircle className='h-4 w-4 text-rose-600' />
              </div>
              <span className='text-[8px] font-black uppercase tracking-[0.2em] text-rose-700 bg-rose-500/10 px-2 py-1 rounded-full text-center'>
                Canceladas
              </span>
            </div>
            <div className='space-y-0.5 text-center sm:text-left'>
              <p className='text-[10px] font-bold text-rose-700/60 uppercase tracking-widest'>
                Rechazadas
              </p>
              <h3 className='text-xl sm:text-2xl font-black text-rose-900 dark:text-rose-100'>
                ${formatCurrency(stats.montoCanceladas)}
              </h3>
              <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
                <span className='text-rose-700 font-black text-sm'>{stats.canceladas}</span>
                <span className='text-[10px] text-rose-700/50 font-medium uppercase tracking-tighter italic'>
                  No procesadas
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const serviciosStats = {
    total: servicios.length,
    pendientes: servicios.filter(s => s.estado === 'pendiente').length,
    aprobadas: servicios.filter(s => s.estado === 'aprobada').length
  };

  return (
    <div className='grid gap-4 grid-cols-1 md:grid-cols-3 mb-6 px-4 sm:px-8'>
      {/* Total Solicitudes */}
      <Card
        style={{
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.2)'
        }}
        className='shadow-sm border-none backdrop-blur-sm rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-emerald-500/20 rounded-2xl'>
              <ShoppingCart className='h-4 w-4 text-emerald-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-emerald-700 bg-emerald-500/10 px-2 py-1 rounded-full text-center'>
              Total
            </span>
          </div>
          <div className='space-y-0.5 text-center sm:text-left'>
            <p className='text-[10px] font-bold text-emerald-700/60 uppercase tracking-widest'>
              Solicitudes
            </p>
            <h3 className='text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-100'>
              {serviciosStats.total}
            </h3>
            <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
              <span className='text-emerald-700 font-bold text-sm'>Servicios</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pendientes */}
      <Card
        style={{
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}
        className='shadow-sm border-none backdrop-blur-sm rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-blue-500/20 rounded-2xl'>
              <Clock className='h-4 w-4 text-blue-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-blue-700 bg-blue-500/10 px-2 py-1 rounded-full text-center'>
              Pendientes
            </span>
          </div>
          <div className='space-y-0.5 text-center sm:text-left'>
            <p className='text-[10px] font-bold text-blue-700/60 uppercase tracking-widest'>
              Por Aprobar
            </p>
            <h3 className='text-xl sm:text-2xl font-black text-blue-900 dark:text-blue-100'>
              {serviciosStats.pendientes}
            </h3>
            <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
              <span className='text-blue-700 font-bold text-sm'>En espera</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aprobadas */}
      <Card
        style={{
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.2)'
        }}
        className='shadow-sm border-none backdrop-blur-sm rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-emerald-500/20 rounded-2xl'>
              <CheckCircle2 className='h-4 w-4 text-emerald-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-emerald-700 bg-emerald-500/10 px-2 py-1 rounded-full text-center'>
              Aprobadas
            </span>
          </div>
          <div className='space-y-0.5 text-center sm:text-left'>
            <p className='text-[10px] font-bold text-emerald-700/60 uppercase tracking-widest'>
              Completadas
            </p>
            <h3 className='text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-100'>
              {serviciosStats.aprobadas}
            </h3>
            <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
              <span className='text-emerald-700 font-bold text-sm'>Exitosas</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
