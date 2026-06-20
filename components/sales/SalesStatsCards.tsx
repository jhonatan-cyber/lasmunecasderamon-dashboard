'use client';

import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Clock, XCircle, TrendingUp, AlertCircle, ShoppingCart } from 'lucide-react';
import { VentaWithDetails } from '@/types/venta';
import { formatCurrency } from '@/lib/business/salesUtils';

interface SalesStatsCardsProps {
  ventas: VentaWithDetails[];
}

export default function SalesStatsCards({ ventas }: SalesStatsCardsProps) {
  const stats = {
    completadas: (ventas || []).filter(
      (v): v is VentaWithDetails => v != null && Number(v.estado) === 1
    ),
    pendientes: (ventas || []).filter(
      (v): v is VentaWithDetails => v != null && Number(v.estado) === 2
    ),
    anulacion: (ventas || []).filter(
      (v): v is VentaWithDetails => v != null && Number(v.estado) === 3
    ),
    anuladas: (ventas || []).filter(
      (v): v is VentaWithDetails => v != null && Number(v.estado) === 0
    )
  };

  const totals = {
    montoCompletadas: stats.completadas.reduce((acc, v) => acc + Number(v.total || 0), 0),
    montoPendientes: stats.pendientes.reduce((acc, v) => acc + Number(v.total || 0), 0),
    montoAnulacion: stats.anulacion.reduce((acc, v) => acc + Number(v.total || 0), 0),
    montoAnuladas: stats.anuladas.reduce((acc, v) => acc + Number(v.total || 0), 0),
    countCompletadas: stats.completadas.length,
    countPendientes: stats.pendientes.length,
    countAnulacion: stats.anulacion.length,
    countAnuladas: stats.anuladas.length
  };

  return (
    <div className='grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-6 px-4 sm:px-8'>
      {}
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
              <TrendingUp className='h-4 w-4 text-emerald-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-emerald-700 bg-emerald-500/10 px-2 py-1 rounded-full text-center'>
              Ingresos
            </span>
          </div>
          <div className='space-y-0.5 text-center sm:text-left'>
            <p className='text-[10px] font-bold text-emerald-700/60 uppercase tracking-widest'>
              Total Completado
            </p>
            <h3 className='text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-100'>
              ${formatCurrency(totals.montoCompletadas)}
            </h3>
            <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
              <span className='text-emerald-700 font-black text-sm'>{totals.countCompletadas}</span>
              <span className='text-[10px] text-emerald-700/50 font-medium uppercase tracking-tighter italic'>
                Ventas
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
        className='shadow-sm border-none backdrop-blur-sm rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-blue-500/20 rounded-2xl'>
              <Clock className='h-4 w-4 text-blue-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-blue-700 bg-blue-500/10 px-2 py-1 rounded-full text-center'>
              En Proceso
            </span>
          </div>
          <div className='space-y-0.5 text-center sm:text-left'>
            <p className='text-[10px] font-bold text-blue-700/60 uppercase tracking-widest'>
              Sin Cerrar
            </p>
            <h3 className='text-xl sm:text-2xl font-black text-blue-900 dark:text-blue-100'>
              ${formatCurrency(totals.montoPendientes)}
            </h3>
            <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
              <span className='text-blue-700 font-black text-sm'>{totals.countPendientes}</span>
              <span className='text-[10px] text-blue-700/50 font-medium uppercase tracking-tighter italic'>
                Cuentas Abiertas
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {}
      <Card
        style={{
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.2)'
        }}
        className='shadow-sm border-none backdrop-blur-sm rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-amber-500/20 rounded-2xl'>
              <AlertCircle className='h-4 w-4 text-amber-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-amber-700 bg-amber-500/10 px-2 py-1 rounded-full text-center'>
              Alertas
            </span>
          </div>
          <div className='space-y-0.5 text-center sm:text-left'>
            <p className='text-[10px] font-bold text-amber-700/60 uppercase tracking-widest'>
              Por Anular
            </p>
            <h3 className='text-xl sm:text-2xl font-black text-amber-900 dark:text-amber-100'>
              {totals.countAnulacion}
            </h3>
            <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
              <span className='text-amber-700 font-bold text-sm'>
                Total: ${formatCurrency(totals.montoAnulacion)}
              </span>
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
        className='shadow-sm border-none backdrop-blur-sm rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-rose-500/20 rounded-2xl'>
              <XCircle className='h-4 w-4 text-rose-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-rose-700 bg-rose-500/10 px-2 py-1 rounded-full text-center'>
              Anulado
            </span>
          </div>
          <div className='space-y-0.5 text-center sm:text-left'>
            <p className='text-[10px] font-bold text-rose-700/60 uppercase tracking-widest'>
              Total Cancelado
            </p>
            <h3 className='text-xl sm:text-2xl font-black text-rose-900 dark:text-rose-100'>
              ${formatCurrency(totals.montoAnuladas)}
            </h3>
            <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
              <span className='text-rose-700 font-black text-sm'>{totals.countAnuladas}</span>
              <span className='text-[10px] text-rose-700/50 font-medium uppercase tracking-tighter italic'>
                Ventas
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
