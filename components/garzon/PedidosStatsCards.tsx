'use client';

import { Card, CardContent } from '@/components/ui/card';
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
      <Card
        style={{
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.2)'
        }}
        className='shadow-xs border-none backdrop-blur-xs rounded-4xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-emerald-500/20 rounded-2xl'>
              <DollarSign className='h-4 w-4 text-emerald-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-emerald-700 bg-emerald-500/10 px-2 py-1 rounded-full text-center'>
              Ganancias
            </span>
          </div>
          <div className='space-y-0.5 text-center sm:text-left'>
            <p className='text-[10px] font-bold text-emerald-700/60 uppercase tracking-widest'>
              Total Ganado
            </p>
            <h3 className='text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-100'>
              ${formatCurrency(totalAmount)}
            </h3>
            <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
              <span className='text-emerald-700 font-black text-sm'>{totalOrders}</span>
              <span className='text-[10px] text-emerald-700/50 font-medium uppercase tracking-tighter italic'>
                Pedidos
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {}
      <Card
        style={{
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}
        className='shadow-xs border-none backdrop-blur-xs rounded-4xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'
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
              {pendingOrders}
            </h3>
            <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
              <span className='text-blue-700 font-bold text-sm'>En espera</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {}
      <Card
        style={{
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.2)'
        }}
        className='shadow-xs border-none backdrop-blur-xs rounded-4xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-emerald-500/20 rounded-2xl'>
              <CheckCircle2 className='h-4 w-4 text-emerald-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-emerald-700 bg-emerald-500/10 px-2 py-1 rounded-full text-center'>
              Aprobados
            </span>
          </div>
          <div className='space-y-0.5 text-center sm:text-left'>
            <p className='text-[10px] font-bold text-emerald-700/60 uppercase tracking-widest'>
              Completados
            </p>
            <h3 className='text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-100'>
              {approvedOrders}
            </h3>
            <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
              <span className='text-emerald-700 font-bold text-sm'>Exitosos</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {}
      <Card
        style={{
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid rgba(244, 63, 94, 0.2)'
        }}
        className='shadow-xs border-none backdrop-blur-xs rounded-4xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-rose-500/20 rounded-2xl'>
              <XCircle className='h-4 w-4 text-rose-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-rose-700 bg-rose-500/10 px-2 py-1 rounded-full text-center'>
              Rechazados
            </span>
          </div>
          <div className='space-y-0.5 text-center sm:text-left'>
            <p className='text-[10px] font-bold text-rose-700/60 uppercase tracking-widest'>
              Cancelados
            </p>
            <h3 className='text-xl sm:text-2xl font-black text-rose-900 dark:text-rose-100'>
              {rejectedOrders}
            </h3>
            <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
              <span className='text-rose-700 font-bold text-sm'>No procesados</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
