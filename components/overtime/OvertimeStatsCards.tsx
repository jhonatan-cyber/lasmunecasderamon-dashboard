"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Clock, Users, DollarSign, TrendingUp, Timer } from 'lucide-react';
import { Overtime } from '@/types/overtime';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

interface OvertimeStatsCardsProps {
  overtime: Overtime[];
}

export default function OvertimeStatsCards({ overtime }: OvertimeStatsCardsProps) {
  // Cálculos precisos basados en los requerimientos del usuario
  const stats = {
    totalHoras: overtime.reduce((acc, o) => acc + (o.hora || 0), 0),
    totalMonto: overtime.reduce((acc, o) => acc + (o.total || 0), 0),
    totalAPagar: overtime.filter(o => o.estado === 1).reduce((acc, o) => acc + (o.total || 0), 0),
    usuariosUnicos: new Set(overtime.map(o => o.usuario_id || o.id_usuario)).size,
  };

  const promedioPorHora = stats.totalHoras > 0 ? stats.totalMonto / stats.totalHoras : 0;

  return (
    <div className='grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'>
      {/* Total a Pagar (Pendientes de Cobro) */}
      <Card className='shadow-md border-none bg-emerald-600 dark:bg-emerald-900 backdrop-blur-sm rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'>
        <CardContent className='p-6'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-3 bg-white/20 rounded-2xl'>
              <DollarSign className='h-5 w-5 text-white' />
            </div>
            <span className='text-[10px] font-black uppercase tracking-tighter text-white bg-white/10 px-2 py-1 rounded-full'>
              Por Pagar
            </span>
          </div>
          <div className='space-y-1'>
            <p className='text-xs font-bold text-emerald-100 uppercase tracking-wider opacity-80'>Total a Pagar</p>
            <h3 className='text-2xl font-black text-white'>
              {formatCurrencyCLP(stats.totalAPagar)}
            </h3>
            <p className='text-[10px] text-emerald-50/60 font-medium uppercase tracking-tighter italic'>Monto pendiente en sistema</p>
          </div>
        </CardContent>
      </Card>

      {/* Total Horas Registradas */}
      <Card className='shadow-md border-none bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'>
        <CardContent className='p-6'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-3 bg-amber-50 dark:bg-amber-900/30 rounded-2xl'>
              <Clock className='h-5 w-5 text-amber-600' />
            </div>
            <span className='text-[10px] font-black uppercase tracking-tighter text-amber-500 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-full'>
              Histórico
            </span>
          </div>
          <div className='space-y-1'>
            <p className='text-xs font-bold text-gray-500 uppercase tracking-wider'>Total Horas</p>
            <h3 className='text-2xl font-black text-gray-900 dark:text-white'>
              {stats.totalHoras.toFixed(1)} <span className='text-sm font-normal text-gray-400'>hrs</span>
            </h3>
            <p className='text-[10px] text-gray-400 font-medium uppercase tracking-tighter'>Suma global de registros</p>
          </div>
        </CardContent>
      </Card>

      {/* Usuarios con Horas Extras */}
      <Card className='shadow-md border-none bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'>
        <CardContent className='p-6'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-3 bg-purple-50 dark:bg-purple-900/30 rounded-2xl'>
              <Users className='h-5 w-5 text-purple-600' />
            </div>
          </div>
          <div className='space-y-1'>
            <p className='text-xs font-bold text-gray-500 uppercase tracking-wider'>Personal con Horas</p>
            <h3 className='text-2xl font-black text-gray-900 dark:text-white'>{stats.usuariosUnicos}</h3>
            <p className='text-[10px] text-gray-400 font-medium uppercase tracking-tighter'>Usuarios con registros</p>
          </div>
        </CardContent>
      </Card>

      {/* Promedio por Hora */}
      <Card className='shadow-md border-none bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'>
        <CardContent className='p-6'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl'>
              <TrendingUp className='h-5 w-5 text-blue-600' />
            </div>
          </div>
          <div className='space-y-1'>
            <p className='text-xs font-bold text-gray-500 uppercase tracking-wider'>Promedio por Hora</p>
            <h3 className='text-2xl font-black text-gray-900 dark:text-white'>{formatCurrencyCLP(promedioPorHora)}</h3>
            <p className='text-[10px] text-gray-400 font-medium uppercase tracking-tighter'>Valor hora promedio sistema</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
