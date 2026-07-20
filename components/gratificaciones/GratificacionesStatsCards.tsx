'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Users, DollarSign, Gift, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { Gratificacion } from '@/types/gratificacion';

interface GratificacionesStatsCardsProps {
  gratificaciones: Gratificacion[];
  formatCurrency: (amount: number) => string;
}

export default function GratificacionesStatsCards({
  gratificaciones,
  formatCurrency
}: GratificacionesStatsCardsProps) {
  const totalRegistros = gratificaciones.length;
  const usuariosUnicos = new Set(gratificaciones.map(g => g.usuario_id || g.id_usuario));
  const totalUsuarios = usuariosUnicos.size;

  const totalMonto = gratificaciones.reduce((acc, g) => acc + g.monto, 0);
  const totalPagado = gratificaciones
    .filter(g => g.estado === 0)
    .reduce((acc, g) => acc + g.monto, 0);
  const totalPorPagar = gratificaciones
    .filter(g => g.estado === 1)
    .reduce((acc, g) => acc + g.monto, 0);

  const stats = [
    {
      title: 'Total Registros',
      value: totalRegistros,
      subtitle: 'Entradas totales',
      icon: Gift,
      color: 'blue',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      borderColor: 'border-blue-100 dark:border-blue-800'
    },
    {
      title: 'Total Pagado',
      value: formatCurrency(totalPagado),
      subtitle: 'Liquidaciones cerradas',
      icon: CheckCircle2,
      color: 'green',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
      borderColor: 'border-green-100 dark:border-green-800'
    },
    {
      title: 'Por Pagar',
      value: formatCurrency(totalPorPagar),
      subtitle: 'Pendiente de cobro',
      icon: Clock,
      color: 'amber',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      borderColor: 'border-amber-100 dark:border-amber-800'
    },
    {
      title: 'Último Promedio',
      value: formatCurrency(totalUsuarios > 0 ? totalMonto / totalUsuarios : 0),
      subtitle: `${totalUsuarios} usuarios activos`,
      icon: TrendingUp,
      color: 'indigo',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      borderColor: 'border-indigo-100 dark:border-indigo-800'
    }
  ];

  return (
    <div className='grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6'>
      {stats.map((stat, index) => (
        <Card
          key={index}
          className={`overflow-hidden border-none shadow-xs group hover:shadow-md transition-all duration-300`}
        >
          <div
            className={`${stat.bgColor} p-4 h-full flex flex-col justify-between border-b-4 ${stat.borderColor}`}
          >
            <div className='flex justify-between items-start mb-4'>
              <div
                className={`p-2 rounded-xl bg-white dark:bg-neutral-800 shadow-xs group-hover:scale-110 transition-transform duration-300`}
              >
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
              <span className='text-[10px] font-bold uppercase tracking-widest text-zinc-400'>
                {stat.title}
              </span>
            </div>

            <div>
              <div className='text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight'>
                {stat.value}
              </div>
              <p className='text-xs font-semibold text-zinc-500 mt-1 uppercase tracking-tight'>
                {stat.subtitle}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
