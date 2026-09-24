'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useDashboardSummary, type DashboardSummary } from '@/hooks/stats/useDashboardSummary';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { MarcarAsistenciaCard } from '@/components/attendance/MarcarAsistenciaCard';

interface DashboardItemConfig {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: string;
  countKey?: keyof DashboardSummary;
  staticCount?: number;
}

interface RoleDashboardProps {
  role: string;
  roleLabel: string;
  subtitle: string;
  skeletonName: string;
  items: DashboardItemConfig[];
  wideLastItem?: boolean;
}

export function RoleDashboard({
  role,
  roleLabel,
  subtitle,
  skeletonName,
  items,
  wideLastItem = false
}: RoleDashboardProps) {
  const { user, loading: userLoading } = useCurrentUser();
  const {
    data: dashboardData,
    isLoading: loadingSummary,
    error: summaryError,
    refetch: refreshDashboard
  } = useDashboardSummary();

  if (userLoading) {
    return (
      <div className='p-6 flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto'></div>
          <p className='mt-4 text-gray-600'>Cargando...</p>
        </div>
      </div>
    );
  }

  if (user?.role?.toLowerCase() !== role) {
    return (
      <div className='p-6 flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-red-600 mb-4'>Acceso Denegado</h1>
          <p className='text-gray-600'>No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  if (summaryError || !dashboardData) {
    return (
      <div className='p-6'>
        <Card className='border-red-200 bg-red-50'>
          <CardContent className='p-8 text-center text-red-600'>
            <h2 className='text-xl font-bold mb-2'>Error al cargar el dashboard</h2>
            <p className='mb-4'>
              No pudimos conectar con el servidor para obtener tus estadísticas.
            </p>
            <Button onClick={() => refreshDashboard()} variant='destructive'>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dashboardItems = items.map(item => ({
    ...item,
    count: item.countKey ? dashboardData[item.countKey] : (item.staticCount ?? 0)
  }));

  return (
    <BoneyardSkeleton
      name={skeletonName}
      loading={userLoading || (loadingSummary && !dashboardData)}
    >
      <div className='p-6 space-y-6'>
        <div className='space-y-4'>
          <div className='text-left'>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
              {user?.name} {user?.lastName} - {roleLabel}
            </h1>
            <p className='text-gray-600 dark:text-gray-400'>{subtitle}</p>
          </div>

          <div className='text-center'>
            <p className='text-sm text-gray-500'>TOTAL A COBRAR</p>
            <div className='text-2xl font-bold text-gray-900 dark:text-white'>
              {loadingSummary ? (
                <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto'></div>
              ) : (
                formatCurrencyCLP(dashboardData.totalACobrar)
              )}
            </div>
          </div>
        </div>

        <MarcarAsistenciaCard />

        <div className='grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-3'>
          {dashboardItems.map((item, index) => (
            <Link key={item.title} href={item.href}>
              <Card
                className={`hover:shadow-lg transition-shadow duration-200 cursor-pointer border-dotted border-2 border-gray-200 ${
                  wideLastItem && index === dashboardItems.length - 1
                    ? 'col-span-2 md:col-span-1'
                    : ''
                }`}
              >
                <CardHeader className='pb-3'>
                  <div className='flex items-center justify-between'>
                    <item.icon className={`h-8 w-8 ${item.color}`} />
                    <span className='text-2xl font-bold text-gray-900 dark:text-white'>
                      {item.count}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className='text-xl font-bold text-gray-900 dark:text-white mb-2'>
                    {item.title}
                  </CardTitle>
                  <CardDescription className='text-sm text-gray-600 dark:text-gray-400'>
                    {item.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </BoneyardSkeleton>
  );
}
