'use client';
import { MetricCard } from '@/components/shared/MetricCard';

import { CheckCircle2, Clock, Users, TrendingUp } from 'lucide-react';
import { Overtime } from '@/types/overtime';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

interface OvertimeStatsCardsProps {
  overtime: Overtime[];
}

export default function OvertimeStatsCards({ overtime }: OvertimeStatsCardsProps) {
  const stats = {
    cobrados: (overtime || []).filter(o => Number(o.estado) === 0),
    porCobrar: (overtime || []).filter(o => Number(o.estado) === 1),
    totalHoras: overtime.reduce((acc, o) => acc + Number(o.hora || 0), 0),
    totalMonto: overtime.reduce((acc, o) => acc + Number(o.total || 0), 0),
    totalAPagar: (overtime || [])
      .filter(o => Number(o.estado) === 1)
      .reduce((acc, o) => acc + Number(o.total || 0), 0),
    usuariosUnicos: new Set(overtime.map(o => o.usuario_id || o.id_usuario)).size
  };

  const promedioPorHora = stats.totalHoras > 0 ? stats.totalMonto / stats.totalHoras : 0;
  const totalHorasPorCobrar = stats.porCobrar.reduce((acc, o) => acc + Number(o.hora || 0), 0);

  return (
    <div className='grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6 [&>*:last-child:nth-child(odd)]:col-span-2 lg:[&>*:last-child:nth-child(odd)]:col-span-1'>
      {}
      <MetricCard
        tone='emerald'
        icon={<CheckCircle2 className='h-4 w-4 text-emerald-600' />}
        badge='Por Pagar'
        label='Total Pendiente'
        value={formatCurrencyCLP(stats.totalAPagar)}
        footer={
          <div className='flex items-center gap-1.5 pt-1'>
            <span className='text-emerald-700 font-black text-sm'>{stats.porCobrar.length}</span>
            <span className='text-[10px] text-emerald-700/50 font-medium uppercase tracking-tighter italic'>
              Registros
            </span>
            <span className='text-emerald-700/40'>•</span>
            <span className='text-emerald-700 font-black text-xs'>
              {totalHorasPorCobrar.toFixed(1)} hrs
            </span>
          </div>
        }
      />

      {}
      <MetricCard
        tone='amber'
        icon={<Clock className='h-4 w-4 text-amber-600' />}
        badge='Histórico'
        label='Total Horas'
        value={
          <>
            {stats.totalHoras.toFixed(1)}{' '}
            <span className='text-sm font-normal text-amber-700/50'>hrs</span>
          </>
        }
        footer={
          <div className='flex items-center gap-1.5 pt-1'>
            <span className='text-amber-700 font-black text-sm'>{stats.usuariosUnicos}</span>
            <span className='text-[10px] text-amber-700/50 font-medium uppercase tracking-tighter italic'>
              Personal
            </span>
          </div>
        }
      />

      {}
      <MetricCard
        tone='purple'
        icon={<Users className='h-4 w-4 text-purple-600' />}
        badge='Personal'
        label='Con Horas'
        value={stats.usuariosUnicos}
        footer={
          <div className='flex items-center gap-1.5 pt-1'>
            <span className='text-purple-700 font-black text-sm'>
              {stats.totalHoras.toFixed(1)}
            </span>
            <span className='text-[10px] text-purple-700/50 font-medium uppercase tracking-tighter italic'>
              Hrs Totales
            </span>
          </div>
        }
      />

      {}
      <MetricCard
        tone='blue'
        icon={<TrendingUp className='h-4 w-4 text-blue-600' />}
        badge='Promedio'
        label='Por Hora'
        value={formatCurrencyCLP(promedioPorHora)}
        footer={
          <div className='flex items-center gap-1.5 pt-1'>
            <span className='text-blue-700 font-black text-sm'>
              {formatCurrencyCLP(stats.totalMonto)}
            </span>
            <span className='text-[10px] text-blue-700/50 font-medium uppercase tracking-tighter italic'>
              Monto Total
            </span>
          </div>
        }
      />
    </div>
  );
}
