'use client';

import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, DollarSign, Clock, ArrowLeftRight, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { useDashboardSummary } from '@/hooks/stats/useDashboardSummary';

export default function DashboardStatsCards() {
  const { user, loading: userLoading } = useCurrentUser();
  const {
    data: dashboardData,
    isLoading: loadingSummary,
    error: summaryError,
    refetch: refreshDashboard
  } = useDashboardSummary();

  if (userLoading || !user || user?.role?.toLowerCase() !== 'cajero') {
    return null;
  }

  if (loadingSummary && !dashboardData) {
    return (
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className='h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse' />
        ))}
      </div>
    );
  }

  if (summaryError || !dashboardData) {
    return (
      <Card className='border-red-200 bg-red-50'>
        <CardContent className='p-4 text-center text-red-600'>
          Error al cargar datos del dashboard.{' '}
          <button onClick={() => refreshDashboard()} className='underline font-bold'>
            Reintentar
          </button>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      title: 'Asistencias',
      value: dashboardData.totalAsistencias,
      icon: Calendar,
      description: 'Total de registros',
      href: '/attendance',
      color: 'text-blue-600'
    },
    {
      title: 'Anticipos',
      value: dashboardData.totalAnticipos,
      icon: ArrowLeftRight,
      description: `${dashboardData.anticiposPendientes} pendientes`,
      href: '/advances',
      color: 'text-orange-600'
    },
    {
      title: 'Propinas',
      value: dashboardData.totalPropinas,
      icon: DollarSign,
      description: `${dashboardData.propinasPendientes} por pagar`,
      href: '/tips',
      color: 'text-green-600'
    },
    {
      title: 'Horas Extras',
      value: dashboardData.totalHorasExtras,
      icon: Clock,
      description: `${dashboardData.horasExtrasPendientes} registradas`,
      href: '/overtime',
      color: 'text-purple-600'
    },
    {
      title: 'Pedidos',
      value: dashboardData.totalPedidos,
      icon: ShoppingCart,
      description: 'Pedidos realizados',
      href: '/orders',
      color: 'text-red-600'
    }
  ];

  return (
    <div className='space-y-6'>
      {}
      <Card className='bg-linear-to-br from-gray-900 to-gray-800 text-white border-none shadow-xl'>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm font-medium text-gray-400 uppercase tracking-wider'>
            Total Neto a Cobrar Estimado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-4xl font-bold'>{formatCurrencyCLP(dashboardData.totalACobrar)}</div>
          <p className='text-xs text-gray-400 mt-2'>
            * Incluye sueldo base + propinas + horas extras - anticipos (pendientes de pago)
          </p>
        </CardContent>
      </Card>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'>
        {stats.map(item => (
          <Link key={item.title} href={item.href}>
            <Card className='hover:shadow-md transition-shadow cursor-pointer border-gray-200 h-full'>
              <CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
                <CardTitle className='text-sm font-medium'>{item.title}</CardTitle>
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{item.value}</div>
                <p className='text-xs text-gray-500'>{item.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
