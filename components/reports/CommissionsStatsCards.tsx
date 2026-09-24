'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, DollarSign, Award, Target } from 'lucide-react';
import type { Statistics } from './hooks/useCommissionsReport';

export const formatNumber = (amount: number) => {
  if (!amount || isNaN(amount) || amount === Infinity || amount === -Infinity) {
    return '0';
  }
  const roundedAmount = Math.round(amount);
  return roundedAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

interface CommissionsStatsCardsProps {
  statistics: Statistics;
}

export function CommissionsStatsCards({ statistics }: CommissionsStatsCardsProps) {
  const stats = [
    {
      title: 'Anfitrionas Activas',
      value: statistics.total_anfitrionas,
      icon: Users,
      color: 'blue',
      grad: 'from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20'
    },
    {
      title: 'Ventas Generadas',
      value: `$${formatNumber(statistics.total_ventas_general)}`,
      sub: `${statistics.total_ventas_count} transacciones`,
      icon: TrendingUp,
      color: 'emerald',
      grad: 'from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20'
    },
    {
      title: 'Servicios Realizados',
      value: `$${formatNumber(statistics.total_servicios_general)}`,
      sub: `${statistics.total_servicios_count} servicios`,
      icon: Target,
      color: 'violet',
      grad: 'from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20'
    },
    {
      title: 'Comisiones Totales',
      value: `$${formatNumber(statistics.total_comisiones_general)}`,
      icon: DollarSign,
      color: 'purple',
      grad: 'from-purple-50 to-fuchsia-50 dark:from-purple-950/20 dark:to-fuchsia-950/20'
    },
    {
      title: 'Promedio x Anfitriona',
      value: `$${formatNumber(Math.round(statistics.promedio_comision_por_anfitriona || 0))}`,
      icon: Award,
      color: 'orange',
      grad: 'from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20'
    }
  ];

  return (
    <div className='grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-6'>
      {stats.map((stat, i) => (
        <Card
          key={i}
          className={`relative border-0 shadow-xl shadow-gray-200/50 dark:shadow-black/20 overflow-hidden group hover:scale-[1.02] transition-all duration-300`}
        >
          <div className={`absolute inset-0 bg-linear-to-br ${stat.grad} opacity-50`}></div>
          <CardHeader className='relative flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400'>
              {stat.title}
            </CardTitle>
            <div
              className={`w-10 h-10 rounded-2xl bg-white dark:bg-gray-800 shadow-xs flex items-center justify-center group-hover:rotate-12 transition-transform`}
            >
              <stat.icon className={`h-5 w-5 text-${stat.color}-600 dark:text-${stat.color}-400`} />
            </div>
          </CardHeader>
          <CardContent className='relative'>
            <div className='text-2xl font-black text-gray-900 dark:text-white tracking-tight'>
              {stat.value}
            </div>
            {stat.sub && <p className='text-xs font-medium text-gray-500 mt-1'>{stat.sub}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
