'use client';

import { Card, CardContent } from '@/components/ui/card';
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
      {/* Total a Pagar (Pendientes de Cobro) */}
      <Card
        style={{
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.2)'
        }}
        className='shadow-sm border-none backdrop-blur-sm rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-emerald-500/20 rounded-2xl'>
              <CheckCircle2 className='h-4 w-4 text-emerald-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-emerald-700 bg-emerald-500/10 px-2 py-1 rounded-full'>
              Por Pagar
            </span>
          </div>
          <div className='space-y-0.5'>
            <p className='text-[10px] font-bold text-emerald-700/60 uppercase tracking-widest'>
              Total Pendiente
            </p>
            <h3 className='text-xl font-black text-emerald-900 dark:text-emerald-100'>
              {formatCurrencyCLP(stats.totalAPagar)}
            </h3>
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
          </div>
        </CardContent>
      </Card>

      {/* Total Horas Registradas */}
      <Card
        style={{
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.2)'
        }}
        className='shadow-sm border-none backdrop-blur-sm rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-amber-500/20 rounded-2xl'>
              <Clock className='h-4 w-4 text-amber-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-amber-700 bg-amber-500/10 px-2 py-1 rounded-full'>
              Histórico
            </span>
          </div>
          <div className='space-y-0.5'>
            <p className='text-[10px] font-bold text-amber-700/60 uppercase tracking-widest'>
              Total Horas
            </p>
            <h3 className='text-xl font-black text-amber-900 dark:text-amber-100'>
              {stats.totalHoras.toFixed(1)}{' '}
              <span className='text-sm font-normal text-amber-700/50'>hrs</span>
            </h3>
            <div className='flex items-center gap-1.5 pt-1'>
              <span className='text-amber-700 font-black text-sm'>{stats.usuariosUnicos}</span>
              <span className='text-[10px] text-amber-700/50 font-medium uppercase tracking-tighter italic'>
                Personal
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal con Horas Extras */}
      <Card
        style={{
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          border: '1px solid rgba(139, 92, 246, 0.2)'
        }}
        className='shadow-sm border-none backdrop-blur-sm rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-purple-500/20 rounded-2xl'>
              <Users className='h-4 w-4 text-purple-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-purple-700 bg-purple-500/10 px-2 py-1 rounded-full'>
              Personal
            </span>
          </div>
          <div className='space-y-0.5'>
            <p className='text-[10px] font-bold text-purple-700/60 uppercase tracking-widest'>
              Con Horas
            </p>
            <h3 className='text-xl font-black text-purple-900 dark:text-purple-100'>
              {stats.usuariosUnicos}
            </h3>
            <div className='flex items-center gap-1.5 pt-1'>
              <span className='text-purple-700 font-black text-sm'>
                {stats.totalHoras.toFixed(1)}
              </span>
              <span className='text-[10px] text-purple-700/50 font-medium uppercase tracking-tighter italic'>
                Hrs Totales
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Promedio por Hora */}
      <Card
        style={{
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}
        className='shadow-sm border-none backdrop-blur-sm rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-blue-500/20 rounded-2xl'>
              <TrendingUp className='h-4 w-4 text-blue-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-blue-700 bg-blue-500/10 px-2 py-1 rounded-full'>
              Promedio
            </span>
          </div>
          <div className='space-y-0.5'>
            <p className='text-[10px] font-bold text-blue-700/60 uppercase tracking-widest'>
              Por Hora
            </p>
            <h3 className='text-xl font-black text-blue-900 dark:text-blue-100'>
              {formatCurrencyCLP(promedioPorHora)}
            </h3>
            <div className='flex items-center gap-1.5 pt-1'>
              <span className='text-blue-700 font-black text-sm'>
                {formatCurrencyCLP(stats.totalMonto)}
              </span>
              <span className='text-[10px] text-blue-700/50 font-medium uppercase tracking-tighter italic'>
                Monto Total
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
