'use client';
import { MetricCard } from '@/components/shared/MetricCard';

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
    <div className='grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4 mb-6 px-4 sm:px-8'>
      {}
      <MetricCard
        tone='emerald'
        icon={<TrendingUp className='h-4 w-4 text-emerald-600' />}
        badge='Ingresos'
        label='Total Completado'
        value={<>${formatCurrency(totals.montoCompletadas)}</>}
        footer={
          <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
            <span className='text-emerald-700 font-black text-sm'>{totals.countCompletadas}</span>
            <span className='text-[10px] text-emerald-700/50 font-medium uppercase tracking-tighter italic'>
              Ventas
            </span>
          </div>
        }
      />

      {}
      <MetricCard
        tone='blue'
        icon={<Clock className='h-4 w-4 text-blue-600' />}
        badge='En Proceso'
        label='Sin Cerrar'
        value={<>${formatCurrency(totals.montoPendientes)}</>}
        footer={
          <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
            <span className='text-blue-700 font-black text-sm'>{totals.countPendientes}</span>
            <span className='text-[10px] text-blue-700/50 font-medium uppercase tracking-tighter italic'>
              Cuentas Abiertas
            </span>
          </div>
        }
      />

      {}
      <MetricCard
        tone='amber'
        icon={<AlertCircle className='h-4 w-4 text-amber-600' />}
        badge='Alertas'
        label='Por Anular'
        value={totals.countAnulacion}
        footer={
          <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
            <span className='text-amber-700 font-bold text-sm'>
              Total: ${formatCurrency(totals.montoAnulacion)}
            </span>
          </div>
        }
      />

      {}
      <MetricCard
        tone='rose'
        icon={<XCircle className='h-4 w-4 text-rose-600' />}
        badge='Anulado'
        label='Total Cancelado'
        value={<>${formatCurrency(totals.montoAnuladas)}</>}
        footer={
          <div className='flex items-center justify-center sm:justify-start gap-1.5 pt-1'>
            <span className='text-rose-700 font-black text-sm'>{totals.countAnuladas}</span>
            <span className='text-[10px] text-rose-700/50 font-medium uppercase tracking-tighter italic'>
              Ventas
            </span>
          </div>
        }
      />
    </div>
  );
}
