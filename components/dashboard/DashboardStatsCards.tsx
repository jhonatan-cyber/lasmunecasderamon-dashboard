'use client';
import { EmployeeModuleLinks } from '@/components/shared/EmployeeModuleLinks';
import { ListLoadError } from '@/components/shared/ListLoadError';

import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { MetricCard } from '@/components/shared/MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, DollarSign, Clock, ArrowLeftRight, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { useDashboardSummary } from '@/hooks/statistics/useDashboardSummary';

export default function DashboardStatsCards() {
  const { user, loading: userLoading } = useCurrentUser();
  const {
    data: dashboardData,
    isLoading: loadingSummary,
    refetch: refreshDashboard
  } = useDashboardSummary();

  if (userLoading || !user || user?.role?.toLowerCase() !== 'cajero') {
    return null;
  }

  if (loadingSummary && !dashboardData) {
    return (
      <div className='grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'>
        {Array.from({ length: 5 }, (_, index) => (
          <MetricCard key={index} icon={<Calendar />} label='Cargando' value='' isLoading />
        ))}
      </div>
    );
  }

  if (!dashboardData)
    return (
      <ListLoadError
        message='Error al cargar datos del dashboard.'
        onRetry={() => refreshDashboard()}
      />
    );

  const stats = [
    {
      title: 'Asistencias',
      value: dashboardData.totalAsistencias,
      icon: Calendar,
      description: 'Total de registros',
      href: '/cashier-attendance',
      tone: 'blue' as const
    },
    {
      title: 'Anticipos',
      value: dashboardData.totalAnticipos,
      icon: ArrowLeftRight,
      description: `${dashboardData.anticiposPendientes} pendientes`,
      href: '/cashier-advances',
      tone: 'orange' as const
    },
    {
      title: 'Propinas',
      value: dashboardData.totalPropinas,
      icon: DollarSign,
      description: `${dashboardData.propinasPendientes} por pagar`,
      href: '/cashier-tips',
      tone: 'emerald' as const
    },
    {
      title: 'Horas Extras',
      value: dashboardData.totalHorasExtras,
      icon: Clock,
      description: `${dashboardData.horasExtrasPendientes} registradas`,
      href: '/cashier-overtime',
      tone: 'purple' as const
    },
    {
      title: 'Pedidos',
      value: dashboardData.totalPedidos,
      icon: ShoppingCart,
      description: 'Pedidos realizados',
      href: '/orders',
      tone: 'rose' as const
    }
  ];

  return (
    <div className='space-y-6'>
      <EmployeeModuleLinks role='cajero' />
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

      <div className='grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'>
        {stats.map((item, index) => (
          <Link
            key={item.title}
            href={item.href}
            className={index === stats.length - 1 ? 'col-span-2 md:col-span-1' : ''}
          >
            <MetricCard
              icon={<item.icon />}
              badge={item.description}
              label={item.title}
              value={item.value}
              tone={item.tone}
              className='h-full'
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
